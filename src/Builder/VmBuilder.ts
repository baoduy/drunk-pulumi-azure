import { Input } from '@pulumi/pulumi';
import { LoginArgs, ResourceInfo, WithEncryption } from '../types';
import {
  Builder,
  BuilderProps,
  IVmBuilder,
  IVmLoginBuilder,
  IVmOsBuilder,
  IVmSizeBuilder,
  IVmVnetBuilder,
  VmBuilderArgs,
  VmEncryptionType,
  VmOsBuilderLinuxProps,
  VmOsBuilderWindowsProps,
  VmSizeTypes,
} from './types';
import { randomLogin } from '../Core/Random';
import VM, { VmScheduleType } from '../VM';
import { VirtualMachine } from '@pulumi/azure-native/compute';

class VmBuilder
  extends Builder<ResourceInfo>
  implements
    IVmOsBuilder,
    IVmSizeBuilder,
    IVmLoginBuilder,
    IVmVnetBuilder,
    IVmBuilder
{
  private _subnetProps: Input<string> | undefined = undefined;
  private _tagsProps: Record<string, Input<string>> | undefined = undefined;
  private _generateLogin: boolean = false;
  private _loginProps: LoginArgs | undefined = undefined;
  private _vmSize: VmSizeTypes | undefined = undefined;
  private _windowImage: VmOsBuilderWindowsProps | undefined = undefined;
  private _linuxImage: VmOsBuilderLinuxProps | undefined = undefined;
  private _schedule: VmScheduleType | undefined = undefined;
  private _encryptionProps: VmEncryptionType | undefined = undefined;

  private _vmInstance: VirtualMachine | undefined = undefined;
  private _ignoreChanges: string[] | undefined = undefined;
  private _osDiskSize: number = 128;
  private _dataDiskSize?: number = undefined;

  constructor(private args: VmBuilderArgs) {
    super(args);
  }
  public enableEncryption(props: VmEncryptionType): IVmBuilder {
    this._encryptionProps = props;
    return this;
  }

  public withSchedule(props: VmScheduleType): IVmBuilder {
    this._schedule = props;
    return this;
  }
  public withSubnetId(props: Input<string>): IVmBuilder {
    this._subnetProps = props;
    return this;
  }
  public withTags(props: Record<string, Input<string>>): IVmBuilder {
    this._tagsProps = props;
    return this;
  }
  public generateLogin(): IVmVnetBuilder {
    this._generateLogin = true;
    return this;
  }
  public withLoginInfo(props: LoginArgs): IVmVnetBuilder {
    this._loginProps = props;
    return this;
  }
  public withSize(props: VmSizeTypes): IVmLoginBuilder {
    this._vmSize = props;
    return this;
  }
  public withWindowsImage(props: VmOsBuilderWindowsProps): IVmSizeBuilder {
    this._windowImage = props;
    return this;
  }
  public withLinuxImage(props: VmOsBuilderLinuxProps): IVmSizeBuilder {
    this._linuxImage = props;
    return this;
  }
  public ignoreChangesFrom(...props: string[]): IVmBuilder {
    this._ignoreChanges = props;
    return this;
  }
  public withOSDiskSize(props: number): IVmBuilder {
    this._osDiskSize = props;
    return this;
  }
  public withDataDiskSize(props: number): IVmBuilder {
    this._dataDiskSize = props;
    return this;
  }

  private buildLogin() {
    if (!this._generateLogin) return;

    const login = randomLogin({
      name: this.commonProps.name,
      loginPrefix: this.commonProps.name,
      maxUserNameLength: 25,
      passwordOptions: {
        length: 50,
        policy: 'yearly',
        options: { lower: true, upper: true, special: true, numeric: true },
      },
      vaultInfo: this.commonProps.vaultInfo,
    });

    this._loginProps = { adminLogin: login.userName, password: login.password };
  }

  private buildVm() {
    this._vmInstance = VM({
      ...this.commonProps,

      enableEncryption:
        Boolean(this._encryptionProps) || this.args.enableEncryption,
      diskEncryptionSetId: this._encryptionProps?.diskEncryptionSetId,

      osDiskSizeGB: this._osDiskSize,
      dataDiskSizeGB: this._dataDiskSize,
      
      subnetId: this._subnetProps!,
      vmSize: this._vmSize!,
      osType: Boolean(this._linuxImage) ? 'Linux' : 'Windows',
      image: this._linuxImage ?? this._windowImage!,
      login: this._loginProps!,
      schedule: this._schedule,
      tags: this._tagsProps,
      ignoreChanges: this._ignoreChanges,
    });
  }

  public build(): ResourceInfo {
    this.buildLogin();
    this.buildVm();

    return {
      name: this.commonProps.name,
      group: this.commonProps.group,
      id: this._vmInstance!.id,
    };
  }
}

export default (props: VmBuilderArgs) => new VmBuilder(props) as IVmOsBuilder;
