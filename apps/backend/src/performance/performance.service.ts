import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
type Sample={timestamp:number;elapsed:number;label:string;success:boolean;bytes:number};
type Sla={p95Ms:number;maxErrorRate:number;minThroughput:number};
@Injectable()
export class PerformanceService {
  constructor(private readonly prisma:PrismaService){}
  preview(file:{originalname:string;size:number;buffer:Buffer},sla:Sla){return this.report(this.parse(file),sla);}
  async create(organizationId:string,userId:string,input:{projectId:string;testRunId?:string;name:string;environment?:string;build?:string;sla:Sla},file:{originalname:string;size:number;buffer:Buffer}){
    if(!input.name?.trim()||input.name.trim().length<2)throw new BadRequestException('Укажите название нагрузочного запуска');
    if(!await this.prisma.project.findFirst({where:{id:input.projectId,organizationId},select:{id:true}}))throw new NotFoundException('Проект не найден');
    if(input.testRunId&&!await this.prisma.testRun.findFirst({where:{id:input.testRunId,projectId:input.projectId}}))throw new BadRequestException('Тест-ран не относится к выбранному проекту');
    const report=this.report(this.parse(file),input.sla);
    const created=await this.prisma.performanceRun.create({data:{organizationId,projectId:input.projectId,testRunId:input.testRunId||null,createdById:userId,name:input.name.trim(),environment:input.environment?.trim()||null,build:input.build?.trim()||null,...this.dbMetrics(report),sla:input.sla as unknown as Prisma.InputJsonValue,slaPassed:report.slaPassed,labels:{create:report.labels.map(label=>({...this.dbLabelMetrics(label),label:label.label}))}},include:{labels:{orderBy:{p95Ms:'desc'}}}});
    return this.present(created);
  }
  async list(organizationId:string,projectId?:string){const items=await this.prisma.performanceRun.findMany({where:{organizationId,...(projectId?{projectId}:{})},orderBy:{createdAt:'desc'},take:100,include:{project:{select:{code:true,name:true}},labels:{orderBy:{p95Ms:'desc'},take:5}}});return items.map(item=>this.present(item));}
  async detail(organizationId:string,id:string){const item=await this.prisma.performanceRun.findFirst({where:{id,organizationId},include:{project:{select:{code:true,name:true}},labels:{orderBy:{p95Ms:'desc'}}}});if(!item)throw new NotFoundException('Нагрузочный запуск не найден');return this.present(item);}
  private parse(file:{originalname:string;size:number;buffer:Buffer}){
    if(!file)throw new BadRequestException('Выберите JTL или CSV файл');
    if(file.size>25*1024*1024)throw new BadRequestException('Файл не должен превышать 25 МБ');
    const name=file.originalname.toLowerCase();if(!name.endsWith('.jtl')&&!name.endsWith('.csv'))throw new BadRequestException('Разрешены только JTL и CSV');
    const text=file.buffer.toString('utf8').replace(/^\uFEFF/,'');const samples=text.trimStart().startsWith('<')?this.xml(text):this.csv(text);
    if(!samples.length)throw new BadRequestException('В файле не найдено результатов JMeter');
    if(samples.length>250000)throw new BadRequestException('Допускается не более 250 000 samples за импорт');return samples;
  }
  private csv(text:string){
    const lines=text.split(/\r?\n/).filter(Boolean);if(lines.length<2)return[];
    const delimiter=lines[0].includes(';')&&!lines[0].includes(',')?';':',';
    const split=(line:string)=>{const cells:string[]=[];let value='',quoted=false;for(let i=0;i<line.length;i++){const char=line[i];if(char==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(char===delimiter&&!quoted){cells.push(value);value='';}else value+=char;}cells.push(value);return cells;};
    const headers=split(lines[0]).map(x=>x.trim());const index=(...names:string[])=>names.map(name=>headers.indexOf(name)).find(value=>value!==-1)??-1;
    const ts=index('timeStamp','timestamp'),elapsed=index('elapsed'),label=index('label'),success=index('success'),code=index('responseCode'),bytes=index('bytes','receivedBytes');
    if(ts<0||elapsed<0||label<0)throw new BadRequestException('CSV должен содержать timeStamp, elapsed и label');
    return lines.slice(1).map((line,row)=>{const cells=split(line),timestamp=Number(cells[ts]),duration=Number(cells[elapsed]);if(!Number.isFinite(timestamp)||!Number.isFinite(duration)||duration<0)throw new BadRequestException(`Строка ${row+2}: некорректное время`);const ok=success>=0?/^true$/i.test(cells[success]):code>=0?Number(cells[code])<400:true;return{timestamp,elapsed:Math.round(duration),label:(cells[label]||'Без названия').slice(0,500),success:ok,bytes:Math.max(0,Number(cells[bytes])||0)};});
  }
  private xml(text:string){
    if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new BadRequestException('DOCTYPE и ENTITY запрещены в JTL');const samples:Sample[]=[];
    const decode=(value:string)=>(value??'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    for(const match of text.matchAll(/<(?:httpSample|sample)\s+([^>]+)>?/g)){const attrs=Object.fromEntries([...match[1].matchAll(/([\w]+)="([^"]*)"/g)].map(item=>[item[1],decode(item[2])]));const timestamp=Number(attrs.ts),elapsed=Number(attrs.t);if(!Number.isFinite(timestamp)||!Number.isFinite(elapsed)||elapsed<0)continue;samples.push({timestamp,elapsed:Math.round(elapsed),label:(attrs.lb||'Без названия').slice(0,500),success:attrs.s!=='false',bytes:Math.max(0,Number(attrs.by)||0)});}return samples;
  }
  private report(samples:Sample[],sla:Sla){const all=this.metrics(samples),groups=new Map<string,Sample[]>();for(const sample of samples)groups.set(sample.label,[...(groups.get(sample.label)??[]),sample]);const labels=[...groups.entries()].map(([label,items])=>({label,...this.metrics(items)})).sort((a,b)=>b.p95Ms-a.p95Ms);const slaPassed=all.p95Ms<=sla.p95Ms&&all.errorRate<=sla.maxErrorRate&&all.throughput>=sla.minThroughput;return{...all,sla,slaPassed,violations:[...(all.p95Ms>sla.p95Ms?[`P95 ${all.p95Ms} мс > ${sla.p95Ms} мс`]:[]),...(all.errorRate>sla.maxErrorRate?[`Ошибки ${all.errorRate}% > ${sla.maxErrorRate}%`]:[]),...(all.throughput<sla.minThroughput?[`Throughput ${all.throughput} < ${sla.minThroughput} req/s`]:[])],labels};}
  private metrics(samples:Sample[]){const values=samples.map(x=>x.elapsed).sort((a,b)=>a-b),start=Math.min(...samples.map(x=>x.timestamp)),end=Math.max(...samples.map(x=>x.timestamp+x.elapsed)),durationMs=Math.max(1,end-start),errorCount=samples.filter(x=>!x.success).length,percentile=(p:number)=>values[Math.min(values.length-1,Math.ceil(values.length*p)-1)]??0;return{sampleCount:samples.length,errorCount,errorRate:Number((errorCount/samples.length*100).toFixed(2)),durationMs,throughput:Number((samples.length/(durationMs/1000)).toFixed(2)),averageMs:Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(2)),minMs:values[0]??0,maxMs:values.at(-1)??0,p50Ms:percentile(.5),p90Ms:percentile(.9),p95Ms:percentile(.95),p99Ms:percentile(.99),receivedBytes:samples.reduce((sum,x)=>sum+x.bytes,0)};}
  private dbMetrics(value:any){const{errorRate,violations,labels,sla,slaPassed,...metrics}=value;return{...metrics,receivedBytes:BigInt(metrics.receivedBytes)};}
  private dbLabelMetrics(value:any){const{errorRate,durationMs,...metrics}=this.dbMetrics(value);return metrics;}
  private present<T extends Record<string,any>>(item:T){const rate=(errors:number,total:number)=>total?Number((errors/total*100).toFixed(2)):0;return{...item,receivedBytes:Number(item.receivedBytes),errorRate:rate(item.errorCount,item.sampleCount),labels:item.labels?.map((label:any)=>({...label,receivedBytes:Number(label.receivedBytes),errorRate:rate(label.errorCount,label.sampleCount)}))};}
}
