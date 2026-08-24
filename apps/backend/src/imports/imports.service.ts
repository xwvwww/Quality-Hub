import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Priority, TestCaseStatus, TestStepSection, TestType } from '@prisma/client';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { PrismaService } from '../prisma/prisma.service';

type Row = { title:string; description:string; status:TestCaseStatus; priority:Priority; type:TestType; durationSeconds:number; preconditions:string; preExpected:string; steps:string; expected:string; postconditions:string; postExpected:string };
const headers = ['Название','Описание','Статус','Приоритет','Тип','Продолжительность','Предусловия — действие','Предусловия — ожидаемый результат','Основные шаги — действие','Основные шаги — ожидаемый результат','Постусловия — действие','Постусловия — ожидаемый результат'];
const statuses:Record<string,TestCaseStatus>={ГОТОВ:TestCaseStatus.READY,ЧЕРНОВИК:TestCaseStatus.DRAFT};
const priorities:Record<string,Priority>={'САМЫЙ ВЫСОКИЙ':Priority.HIGHEST,ВЫСОКИЙ:Priority.HIGH,СРЕДНИЙ:Priority.MEDIUM,НИЗКИЙ:Priority.LOW,'ОЧЕНЬ НИЗКИЙ':Priority.LOWEST};
const priorityNames:Record<Priority,string>={HIGHEST:'Самый высокий',HIGH:'Высокий',MEDIUM:'Средний',LOW:'Низкий',LOWEST:'Очень низкий'};

@Injectable()
export class ImportsService {
  constructor(private prisma:PrismaService){}

  async import(org:string,projectId:string,userId:string,file:{originalname:string;buffer:Buffer},commit:boolean,folderId?:string){
    await this.project(org,projectId);
    if(folderId&&!await this.prisma.testCaseFolder.findFirst({where:{id:folderId,projectId},select:{id:true}}))throw new BadRequestException('Выбранная папка не принадлежит проекту');
    if(!file)throw new BadRequestException('Выберите CSV или XLSX файл');
    const raw=file.originalname.toLowerCase().endsWith('.csv')?this.csv(file.buffer.toString('utf8')):await this.xlsx(file.buffer);
    if(raw.length>1000)throw new BadRequestException('За один импорт разрешено не более 1000 строк');
    const rows:Row[]=[],errors:Array<{row:number;message:string}>=[];
    raw.forEach((value,index)=>{try{rows.push(this.normalize(value))}catch(error){errors.push({row:index+2,message:error instanceof Error?error.message:'Некорректная строка'})}});
    if(commit&&errors.length)throw new BadRequestException({message:'Исправьте ошибки импорта',errors});
    if(commit&&rows.length)await this.prisma.$transaction(async tx=>{
      const project=await tx.project.update({where:{id:projectId},data:{nextTestCaseNumber:{increment:rows.length}},select:{nextTestCaseNumber:true}});
      const start=project.nextTestCaseNumber-rows.length;
      for(let index=0;index<rows.length;index++){
        const row=rows[index];
        const testCase=await tx.testCase.create({data:{projectId,folderId:folderId??null,caseNumber:start+index,title:row.title,status:row.status,priority:row.priority,type:row.type,authorId:userId,versions:{create:{version:1,description:row.description||null,durationSeconds:row.durationSeconds,createdById:userId}}},include:{versions:true}});
        const versionId=testCase.versions[0].id;
        const steps=[...this.stepRows(versionId,TestStepSection.PRECONDITION,row.preconditions,row.preExpected),...this.stepRows(versionId,TestStepSection.ACTION,row.steps,row.expected),...this.stepRows(versionId,TestStepSection.POSTCONDITION,row.postconditions,row.postExpected)];
        if(steps.length)await tx.testStep.createMany({data:steps});
      }
    });
    return{valid:rows.length,invalid:errors.length,errors,imported:commit?rows.length:0,preview:rows.slice(0,20)};
  }

  async export(org:string,projectId:string,format:'csv'|'xlsx'){
    const{project,rows}=await this.exportRows(org,projectId);
    if(format==='csv'){
      const text='\uFEFF'+[headers,...rows].map(row=>row.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(';')).join('\r\n');
      return{name:`${project.code}-test-cases.csv`,mime:'text/csv; charset=utf-8',buffer:Buffer.from(text)};
    }
    const workbook=this.book(rows);
    return{name:`${project.code}-test-cases.xlsx`,mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await workbook.xlsx.writeBuffer())};
  }

  async template(org:string,projectId:string){
    await this.project(org,projectId);
    const workbook=this.book([['Успешная авторизация','Проверка входа с корректными данными','Готов','Высокий','FUNCTIONAL','1m 30s','Открыть страницу входа','Страница входа загружена','Ввести корректный логин\nВвести корректный пароль\nНажать «Войти»','Логин принят\nПароль принят\nОткрыта главная страница','Выйти из системы','Сессия завершена']]);
    return{mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await workbook.xlsx.writeBuffer())};
  }

  private async exportRows(org:string,id:string){
    const project=await this.project(org,id);
    const items=await this.prisma.testCase.findMany({where:{projectId:id},orderBy:{caseNumber:'asc'},include:{versions:{orderBy:{version:'desc'},take:1,include:{steps:{orderBy:[{section:'asc'},{position:'asc'}]}}}}});
    return{project,rows:items.map(item=>{
      const version=item.versions[0],steps=version?.steps??[];
      const values=(section:TestStepSection,key:'action'|'expectedResult')=>steps.filter(step=>step.section===section).map(step=>step[key]).join('\n');
      return[item.title,version?.description??'',item.status===TestCaseStatus.READY?'Готов':'Черновик',priorityNames[item.priority],item.type,this.duration(version?.durationSeconds??0),values(TestStepSection.PRECONDITION,'action'),values(TestStepSection.PRECONDITION,'expectedResult'),values(TestStepSection.ACTION,'action'),values(TestStepSection.ACTION,'expectedResult'),values(TestStepSection.POSTCONDITION,'action'),values(TestStepSection.POSTCONDITION,'expectedResult')];
    })};
  }

  private book(rows:any[][]){
    const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Тест-кейсы',{views:[{state:'frozen',ySplit:1}]});
    sheet.addRow(headers);rows.forEach(row=>sheet.addRow(row));
    sheet.getRow(1).height=34;sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF4F46E5'}};
    sheet.columns=[36,42,16,19,18,20,44,44,52,52,44,44].map(width=>({width}));
    sheet.eachRow(row=>{row.alignment={vertical:'top',wrapText:true}});sheet.autoFilter={from:'A1',to:'L1'};
    for(let row=2;row<=1001;row++){
      sheet.getCell(`C${row}`).dataValidation={type:'list',allowBlank:false,formulae:['"Готов,Черновик"']};
      sheet.getCell(`D${row}`).dataValidation={type:'list',allowBlank:false,formulae:['"Самый высокий,Высокий,Средний,Низкий,Очень низкий"']};
      sheet.getCell(`E${row}`).dataValidation={type:'list',allowBlank:false,formulae:[`"${Object.values(TestType).join(',')}"`]};
    }
    return workbook;
  }

  private normalize(values:string[]):Row{
    const modern=values.length>=12,title=(values[0]??'').trim();
    if(title.length<2||title.length>255)throw new Error('Название обязательно: от 2 до 255 символов');
    const status=this.enumValue(modern?values[2]:'Черновик',statuses,TestCaseStatus,TestCaseStatus.DRAFT,'статус');
    const priority=this.enumValue(modern?values[3]:values[2],priorities,Priority,Priority.MEDIUM,'приоритет');
    const type=this.enumValue(modern?values[4]:values[3],{},TestType,TestType.FUNCTIONAL,'тип теста');
    return{title,description:values[1]?.trim()??'',status,priority,type,durationSeconds:this.seconds((modern?values[5]:values[4])??''),preconditions:values[modern?6:5]??'',preExpected:modern?values[7]??'':'',steps:values[modern?8:6]??'',expected:values[modern?9:7]??'',postconditions:values[modern?10:8]??'',postExpected:modern?values[11]??'':''};
  }
  private enumValue<T extends string>(raw:string|undefined,labels:Record<string,T>,values:Record<string,T>,fallback:T,name:string):T{const text=raw?.trim().toUpperCase();if(!text)return fallback;const value=labels[text]??values[text];if(!value)throw new Error(`Неизвестный ${name}: ${raw}`);return value}
  private stepRows(versionId:string,section:TestStepSection,actions:string,expected:string){const actionLines=this.lines(actions),expectedLines=this.lines(expected);return actionLines.map((action,position)=>({versionId,section,position,action,expectedResult:expectedLines[position]??''}))}
  private seconds(value:string){let total=0,found=false;for(const match of value.matchAll(/(\d+)\s*([hms])/gi)){found=true;total+=Number(match[1])*(match[2].toLowerCase()==='h'?3600:match[2].toLowerCase()==='m'?60:1)}if(value.trim()&&!found)throw new Error('Продолжительность: формат 1h 2m 3s');return total}
  private duration(seconds:number){return`${Math.floor(seconds/3600)?`${Math.floor(seconds/3600)}h `:''}${Math.floor(seconds%3600/60)?`${Math.floor(seconds%3600/60)}m `:''}${seconds%60?`${seconds%60}s`:''}`.trim()||'0s'}
  private lines(value:string){return value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean)}
  private csv(text:string){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);return lines.slice(1).map(line=>{const output:string[]=[];let current='',quoted=false;for(let index=0;index<line.length;index++){const character=line[index];if(character==='"'&&line[index+1]==='"'){current+='"';index++}else if(character==='"')quoted=!quoted;else if((character===';'||character===',')&&!quoted){output.push(current);current=''}else current+=character}output.push(current);return output})}
  private async xlsx(buffer:Buffer){
    const workbook=new ExcelJS.Workbook();
    try{await workbook.xlsx.load(buffer as any)}catch{
      try{await workbook.xlsx.load(await this.normalizeWorkbookXml(buffer) as any)}catch{throw new BadRequestException('Не удалось прочитать XLSX. Откройте файл в Excel, сохраните как XLSX и повторите импорт')}
    }
    const sheet=workbook.worksheets[0];if(!sheet)throw new BadRequestException('В XLSX нет листов');const output:string[][]=[];sheet.eachRow((row,number)=>{if(number>1){const values=headers.map((_,index)=>String(row.getCell(index+1).text??''));if(values.some(value=>value.trim()))output.push(values)}});return output
  }
  private async normalizeWorkbookXml(buffer:Buffer){
    const archive=await JSZip.loadAsync(buffer);
    const entries=Object.values(archive.files).filter(entry=>!entry.dir&&entry.name.startsWith('xl/')&&entry.name.endsWith('.xml'));
    if(!entries.length)throw new Error('XML XLSX отсутствует');
    await Promise.all(entries.map(async entry=>{
      const xml=await entry.async('string');
      archive.file(entry.name,xml.replace(/(<\/?)x:/g,'$1').replace(/xmlns:x=/g,'xmlns='));
    }));
    return archive.generateAsync({type:'nodebuffer'});
  }
  private async project(org:string,id:string){const project=await this.prisma.project.findFirst({where:{id,organizationId:org},select:{id:true,code:true}});if(!project)throw new NotFoundException('Проект не найден');return project}
}
