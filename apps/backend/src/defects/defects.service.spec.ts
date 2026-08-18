import{NotFoundException}from'@nestjs/common';import{DefectsService}from'./defects.service';
describe('DefectsService',()=>{const prisma:any={project:{findFirst:jest.fn()},defect:{findFirst:jest.fn(),delete:jest.fn()},$transaction:jest.fn()};const service=new DefectsService(prisma);
beforeEach(()=>jest.clearAllMocks());
it('изолирует дефекты по организации',async()=>{prisma.defect.findFirst.mockResolvedValue(null);await expect(service.get('org-a','defect-id')).rejects.toBeInstanceOf(NotFoundException);expect(prisma.defect.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:{id:'defect-id',project:{organizationId:'org-a'}}}))});
it('удаляет только найденный tenant-scoped дефект',async()=>{prisma.defect.findFirst.mockResolvedValue({id:'d',defectNumber:1,projectId:'p',project:{code:'QA',name:'QA'},testCase:null});prisma.defect.delete.mockResolvedValue({});await expect(service.remove('org-a','d')).resolves.toEqual({success:true});expect(prisma.defect.delete).toHaveBeenCalledWith({where:{id:'d'}})});
});
