import { Injectable } from '@nestjs/common';
import { createPublicClient, http } from 'viem';
import { bscTestnet, bsc } from 'viem/chains';
import OTC_ADMIN_ABI from './abi/OTCAdmin.abi.json';

@Injectable()
export class AdminChainService {
  private client = createPublicClient({
    chain: process.env.CHAIN_ID === '56' ? bsc : bscTestnet,
    transport: http(process.env.RPC_URL),
  });

  private adminAddr = process.env.OTC_ADMIN_ADDRESS as `0x${string}`;

  async isAdmin(wallet: `${string}`): Promise<boolean> {
    const res = await this.client.readContract({
      address: this.adminAddr,
      abi: OTC_ADMIN_ABI,
      functionName: 'isAdmin',
      args: [wallet],
    });

    return Boolean(res);
  }
}
