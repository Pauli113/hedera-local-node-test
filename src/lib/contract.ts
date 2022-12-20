import { HttpException } from '@nestjs/common';
import solc from 'solc';
import { existsSync, fstat, mkdirSync, readFileSync, writeFileSync } from 'fs';
import Web3 from 'web3';
import yaml from 'js-yaml';

type Manifest = {
  registry: {
    file: string
  },
  contracts: ContractManifest[]
}

type ContractManifest = {
  name: string,
  versions: ContractVersion[]
}

type ContractVersion = {
  name: string,
  files: {
    [name: string]: string
  }
  flags: string[] | null
}


const CONTRACT_REGISTRY_NAME = 'ContractRegistry';

export type AllContracts = {
  registry: {
    abi: any,
    bytecode: any
  },
  contracts: {
    [key: string]: {
      name: string, // process
      version: string, // v1
      contract: string, // ProcessRegistry
      key: string, // process/v1
      flags: string[] // ['process/sign/v1']
      abi: any,
      bytecode: any
    }
  }
}

/**
 * YES
 */
 export function dumpABI(allContracts: AllContracts, outputBase: string) {
  // Registry
  if(!existsSync(`${outputBase}/registry`)) {
    mkdirSync(`${outputBase}/registry`);
  }
  writeFileSync(`${outputBase}/registry/${CONTRACT_REGISTRY_NAME}.json`, JSON.stringify(allContracts.registry.abi));
  // Contracts
  Object.keys(allContracts.contracts).forEach((contractKey) => {
    const contract = allContracts.contracts[contractKey];
    const contractName = contract.contract;
    if(!existsSync(`${outputBase}/${contractKey}`)) {
      mkdirSync(`${outputBase}/${contractKey}`, { recursive: true });
    }

    writeFileSync(`${outputBase}/${contractKey}/${contractName}.json`, JSON.stringify(contract.abi));
  });
}

export function getDeployedContract(
  web3: Web3, 
  abi: any, 
  address: string
) {
  const contract = new web3.eth.Contract(abi, address);

  return contract;
}

export async function deployContract(
  web3: Web3, 
  from: string,
  abi: any, 
  bytecode: any,
  args: any[]
) {

  const contract = new web3.eth.Contract(abi);

  const newContractInstance = await contract.deploy({
    data: bytecode,
    arguments: args,
  }).send({
    from,
    gas: 1500000,
    gasPrice: web3.utils.toWei('0.00003', 'ether')});
  
  // store contract in mongo
  return newContractInstance.options.address;
}

export function compileAllContracts(contractBase: string): AllContracts {
  const manifest = yaml.load(readFileSync(`${contractBase}/manifest.yml`).toString()) as Manifest;

  const allContracts = {
    registry: getCompiledContract(`${contractBase}/${manifest.registry.file}`, CONTRACT_REGISTRY_NAME),
    contracts: {}
  }

  for(const contract of manifest.contracts) {
    for(const version of contract.versions) {
      for(const file of Object.keys(version.files)) {
        const contractKey = `${contract.name}/${version.name}`;
        allContracts.contracts[contractKey] = {
          name: contract.name,
          contract: file,
          key: contractKey,
          version: version.name,
          flags: version.flags || [],
          ...getCompiledContract(`${contractBase}/${version.files[file]}`, file),
        }
      }
    }
  }

  return allContracts;
}


function getCompiledContract(filePath: string, name: string) {
  const fileName = `${name}.sol`;

  const input = {
    language: 'Solidity',
    sources: {
      [fileName]: {
        content: readFileSync(filePath).toString()
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*']
        }
      }
    }
  };

  const base = JSON.parse(
    solc.compile(
      JSON.stringify(input)
    )
  )

  if(base.errors) {
    console.error(base.errors);
    throw new HttpException(base.errors, 500);
  }

  const contractObj = base.contracts[fileName][name];

  return {
    abi: contractObj.abi,
    bytecode: contractObj.evm.bytecode.object,
  }
}
