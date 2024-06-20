export type VmBuilderResults = {};

export type VmOsBuilderWindowsProps = {};
export type VmOsBuilderLinuxProps = {};

export interface VmOsBuilder {
  withWindows: (props: VmOsBuilderWindowsProps) => void;
  withLinux: (props: VmOsBuilderLinuxProps) => void;
}
