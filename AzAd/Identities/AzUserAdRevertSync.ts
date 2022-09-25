//This will create a App Registration with enough permission for Application to read users from Azure AD and sync back to AD DS on-premise.

import { KeyVaultInfo } from "../../types";
import Identity from "../Identity";
import {getGraphPermissions} from "../GraphDefinition";

interface Props {
    name: string;
    vaultInfo: KeyVaultInfo;
}

export default ({ name, ...others }: Props) => {
    const graphAccess = getGraphPermissions(
        { name: 'User.Read.All', type: 'Role' },
        { name: 'Group.Read.All', type: 'Role' }
    );

    const identity = Identity({
        name,
        allowImplicit: false,
        createClientSecret: true,
        createPrincipal: true,
        requiredResourceAccesses:[graphAccess],
        ...others,
    });


    return identity;
};
