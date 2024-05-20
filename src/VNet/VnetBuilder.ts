import IpAddressPrefix, {PublicIpAddressPrefixProps, PublicIpAddressPrefixResult} from "./IpAddressPrefix";

export class VnetBuilder {
  /** The Instances */
  _ipAddressInstance:PublicIpAddressPrefixResult|undefined = undefined;
  
  public createPublicIpaddress(props: PublicIpAddressPrefixProps): this {
    this._ipAddressInstance = IpAddressPrefix(props);
    return this;
  }
  
  public createNatGateway(): this{
    return this;
  }
  
  public build(){
    
  }
}

export default VnetBuilder;
