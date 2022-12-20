import { Body, Controller, Get, HttpCode, HttpException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { APIKeyAuthGuard } from '../user/api-key.guard';
import { ProcessService } from './process.service';
import { QueryService } from './query.service';
import { Signature } from './signature.entity';
import { Process } from './process.entity';
import web3 from 'web3';

@Controller()
export class QueryController {
  constructor(
    private readonly processService: ProcessService,
    private readonly queryService: QueryService,
  ) {}

  private async hydrateProcesses(userId: number, processes: Process[]) {
    const processIds = processes.map((p) => (p.id));

    const publicProcesses = await this.queryService.getPublicProcessBatch(processIds);
    const publicProcessMap = new Map(publicProcesses.map((p) => [p.id, p]));

    const signatures = await this.processService.getSignaturesForProcesses(userId, processIds);
    const groupedSignatures: {[k: string]: Signature[]} = signatures.reduce((acc, item) => {
      acc[item.process_id] = acc[item.process_id] || [];
      acc[item.process_id].push(item);
      return acc;
    }, {});

    const hydrated = processes.map((p) => {
      const publicData: any = publicProcessMap.get(p.id);
      if (publicData) {
        const signatureMap = new Map(publicData.signatures.map((p) => [p.id, p]));
        const mergedSignatures = (groupedSignatures[p.id] || []).map((sig) => {
          const publicSig = signatureMap.get(sig.hash);
          if (publicSig) {
            return {
              ...sig,
              status: 'complete',
            }
          } else {
            return sig; // use sig.status
          }
        });

        return {
          ...p,
          signatures: mergedSignatures,
          status: 'complete'
        }
      } else {
        return {
          ...p,
          signatures: groupedSignatures[p.id] || [],
          // use p.status
        }
      }
    });

    return hydrated;
  }

  @Get('/v2/query')
  @UseGuards(APIKeyAuthGuard)  
  async query(
    @Query('processId') processId: string | null,
    @Query('hash') hash: string | null,
    @Req() req,
  ) {
    const userId = req.user.id;

    function getKeysFor(base: string) {
      return Object.keys(req.query).filter((k) => k.startsWith(`${base}.`)).map((k) => {
        return {
          key: k.replace(`${base}.`, ''),
          value: req.query[k],
        }
      });
    }

    const signatureKeys = getKeysFor('signature');
    const processKeys = getKeysFor('process');

    if (hash && !web3.utils.isHexStrict(hash)) {
      throw new HttpException('Hash hex is invalid', 400);
    }    

    if (processId && hash) {
      throw new HttpException('Cannot query by processId and hash at the same time', 400);
    }

    if (processId && (signatureKeys.length || processKeys.length)) {
      throw new HttpException('Cannot query by processId and process/signature keys at the same time', 400);
    }

    const processes = processId ? await this.processService.getProcess(userId, processId) : await this.processService.getAllProcessesForUser(userId, hash, signatureKeys, processKeys);

    const hydrated = await this.hydrateProcesses(userId, processes);

    return {
      processes: hydrated
    };
  }
}
