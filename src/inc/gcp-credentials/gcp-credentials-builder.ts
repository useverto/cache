import { GcpCredentialsProvider } from "./models";

export class GcpCredentialsBuilder {

    private type: string;
    private projectId: string;
    private privateKeyId: string;
    private privateKey: string;
    private email: string;
    private clientId: string;
    private authUri: string;
    private tokenUri: string;
    private certProvider: string;
    private certUrl: string;

    setType(type: string): this {
        this.type = type;
        return this;
    }

    setProjectId(projectId: string): this {
        this.projectId = projectId;
        return this;
    }

    setPrivateKeyId(privateKeyId: string): this {
        this.privateKeyId = privateKeyId;
        return this;
    }

    setPrivateKey(privateKey: string): this {
        this.privateKey = privateKey;
        return this;
    }

    setEmail(email: string): this {
        this.email = email;
        return this;
    }

    setClientId(clientId: string): this {
        this.clientId = clientId;
        return this;
    }

    setAuthUri(authUri: string): this {
        this.authUri = authUri;
        return this;
    }

    setTokenUri(tokenUri: string): this {
        this.tokenUri = tokenUri;
        return this;
    }

    setCertProvider(certProvider: string): this {
        this.certProvider = certProvider;
        return this;
    }

    setCertUrl(certUrl: string): this {
        this.certUrl = certUrl;
        return this;
    }

    build(): GcpCredentialsProvider {
        return {
            "type": this.type,
            "project_id": this.projectId,
            "private_key_id": this.privateKeyId,
            "private_key": this.privateKey,
            "client_email": this.email,
            "client_id": this.clientId,
            "auth_uri": this.authUri,
            "token_uri": this.tokenUri,
            "auth_provider_x509_cert_url": this.certProvider,
            "client_x509_cert_url": this.certUrl
        }
    }

    static getBuilder(): GcpCredentialsBuilder {
        return new GcpCredentialsBuilder();
    }

}
