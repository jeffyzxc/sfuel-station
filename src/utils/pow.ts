import PowChains from '../config/pow.json';
import Web3 from 'web3';
import mineGasForTransaction from './miner';
import { Wallet } from '@ethersproject/wallet';
import BN from 'bn.js';
import {config} from 'process';
import {configure} from '@testing-library/react';
import {BigNumber, utils} from 'ethers';
import {configureChains} from 'wagmi';

interface Params {
    account: string;
    isMainnet: boolean;
}

export const userProofOfWork = async (params: Params ) : Promise<any> => {

    const web3 = new Web3();

    const randomSignerWallet = Wallet.createRandom();
    
    const randomSignerPrivatekey = randomSignerWallet.privateKey;
    const randomSignerAddress = randomSignerWallet.address;

    let nonce = new BN(0);
    let gas = new BN(50000);

    const gasPrice: string = await mineGasForTransaction(web3, nonce, gas, randomSignerAddress);
    
    const chains = PowChains.testnet;
    const configurations = await Promise.all(chains.map(async(chain) => {
        const w3 = new Web3(chain.rpc);
        return {
            chain,
            web3: w3, 
            to: chain.public.address,
            data: chain.public.fnHash + "000000000000000000000000" + params.account.substring(2),
            nonce,
            gas,
            gasPrice,
            balance: await w3.eth.getBalance(params.account)
        };
    }));

    const transactions = await Promise.all(configurations.map(async(config) => {
         return {
                signedTx: await config.web3.eth.accounts.signTransaction({
                    from: randomSignerAddress,
                    to: config.to,
                    data: config.data,
                    nonce: nonce.toNumber(),
                    gas: gas.toNumber(),
                    gasPrice
                }, randomSignerPrivatekey),
                w3: config.web3
            }

    }));

    const fillUps = await Promise.all(transactions.map(async(tx) => {
        if (!tx.signedTx.rawTransaction) return "Error: Raw Transaction Does Not Exist";
        try {
            return await tx.w3.eth.sendSignedTransaction(tx.signedTx.rawTransaction);
        } catch (err) {
            return err;
        }
    }));
    
    return fillUps;
}


export const devProofOfWork = async(params: Params) : Promise<any> => {}

