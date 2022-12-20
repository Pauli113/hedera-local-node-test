import { HttpException, Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Process } from './process.entity';
import { Signature } from './signature.entity';
import { ContractDataService } from '../contract/contract.data.service';

@Injectable()
export class ProcessService {
  constructor(
    private readonly contractDataService: ContractDataService,
    private readonly dataSource: DataSource,
    @InjectRepository(Process) private processRepository: Repository<Process>,
    @InjectRepository(Signature) private signatureRepository: Repository<Signature>,
  ) {}

  async storeProcess(params: {
    userId: number,
    processId: string,
    contractId: number,
    transactionHash: string,
    documentHash: string,
    publicMeta: any,
    privateMeta: any,
    completed: boolean,
  }) {
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(Process)
      .values({
        id: params.processId,
        user_id: params.userId,
        contract: params.contractId,
        transaction_hash: params.transactionHash,
        document_hash: params.documentHash,
        public_meta: params.publicMeta,
        private_meta: params.privateMeta,
        status: params.completed ? 'completed' : 'pending'
      })
      .execute()
  }

  async storeSignature(params: {
    userId: number,
    processId: string,
    transactionHash: string,
    fromHash: string,
    toHash: string,
    publicMeta: any,
    privateMeta: any,
    completed: boolean,
  }) {
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(Signature)
      .values({
        user_id: params.userId,
        process_id: params.processId,
        hash: params.transactionHash,
        public_meta: params.publicMeta,
        private_meta: params.privateMeta,
        from_hash: params.fromHash,
        to_hash: params.toHash,
        status: params.completed ? 'completed' : 'pending'
      })
      .execute()
  }

  /**
   * 
   */
  async getAllProcessesForUser(userId: number, hash: string | null, signatureKeys: {key: string, value: string}[], processKeys: {key: string, value: string}[]) {
    const baseQuery = this.processRepository.createQueryBuilder('process')
      .leftJoin('Signature', 'signature', 'process.id = signature.process_id')
      .where('process.user_id = :userId', { userId });

    const withSig = signatureKeys.reduce((qb, {key, value}, idx) => {
      const signaturePrivateNameKey = `signature_private_${idx}_key`;
      const signaturePrivateNameValue = `signature_private_${idx}_value`;
      const signaturePublicNameKey = `signature_public_${idx}_key`;
      const signaturePublicNameValue = `signature_public_${idx}_value`;
      return qb.andWhere(qb => {
        qb.where(`signature.private_meta ->> :${signaturePrivateNameKey} = :${signaturePrivateNameValue}`, { [signaturePrivateNameKey]: key, [signaturePrivateNameValue]: value })
          .orWhere(`signature.public_meta ->> :${signaturePublicNameKey} = :${signaturePublicNameValue}`, { [signaturePublicNameKey]: key, [signaturePublicNameValue]: value })
      });
    }, baseQuery);

    const withProc = processKeys.reduce((qb, {key, value}, idx) => {
      const processPrivateNameKey = `process_private_${idx}_key`;
      const processPrivateNameValue = `process_private_${idx}_value`;
      const processPublicNameKey = `process_public_${idx}_key`;
      const processPublicNameValue = `process_public_${idx}_value`;
      return qb.andWhere(qb => {
        qb.where(`process.private_meta ->> :${processPrivateNameKey} = :${processPrivateNameValue}`, { [processPrivateNameKey]: key, [processPrivateNameValue]: value })
          .orWhere(`process.public_meta ->> :${processPublicNameKey} = :${processPublicNameValue}`, { [processPublicNameKey]: key, [processPublicNameValue]: value })
      });
    }, withSig);

    const withHash = hash ? withProc.andWhere(qb => {
      qb.where('process.document_hash = :hash', { hash })
        .orWhere('signature.from_hash = :hash', { hash })
        .orWhere('signature.to_hash = :hash', { hash })
    }) : withProc;

    return withHash.printSql().getMany();
  }

  async getProcess(userId: number, processId: string) {
    const processes = await this.processRepository.find({
      where: {
        id: processId,
        user_id: userId
      }
    });

    return processes || [];
  }

  async getSignaturesForProcesses(userId: number, processIds: string[]) {
    const signatures = await this.signatureRepository.find({
      where: {
        process_id: In(processIds),
        user_id: userId
      }
    });

    return signatures;
  }

  async getContractForProcess(userId: number, processId: string) {
    const process = await this.processRepository.findOne({
      where: {
        id: processId,
        user_id: userId
      }
    });

    if(!process) {
      return null
    }

    const contract = await this.contractDataService.getById(userId, process.contract);

    return contract;
  }
}
