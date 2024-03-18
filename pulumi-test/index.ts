import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import {DefaultAzureCredential} from '@azure/identity';

const rs = (async ()=> {
    const credential = new DefaultAzureCredential();
    credential.
})();

export default pulumi.output(rs)
