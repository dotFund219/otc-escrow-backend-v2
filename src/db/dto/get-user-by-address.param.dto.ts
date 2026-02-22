import { Transform } from 'class-transformer';
import { IsEthereumAddress } from 'class-validator';

export class GetUserByAddressParamDto {
  @Transform(({ value }) => String(value).trim().toLowerCase())
  @IsEthereumAddress()
  address!: `0x${string}`;
}
