import {GcpCredentialsBuilder} from "./gcp-credentials-builder";
import {GcpCredentialsProvider} from "./models";

export class GcpCredentials {

    public static getCredentials = (): GcpCredentialsProvider => GcpCredentialsBuilder.getBuilder()
        .setType(process.env["GCP_TYPE"]!)
        .setProjectId(process.env["GCP_PROJECT_ID"]!)
        .setPrivateKeyId(process.env["GCP_PRIVATE_KEY_ID"]!)
        .setPrivateKey(atob(process.env["GCP_PRIVATE_KEY"]!))
        .setEmail(process.env["GCP_EMAIL"]!)
        .setClientId(process.env["GCP_CLIENT_ID"]!)
        .setAuthUri(process.env["GCP_AUTH_URI"]!)
        .setTokenUri(process.env["GCP_TOKEN_URI"]!)
        .setCertProvider(process.env["GCP_CERT_PROVIDER"]!)
        .setCertUrl(process.env["GCP_CERT_URL"]!)
        .build();

}
