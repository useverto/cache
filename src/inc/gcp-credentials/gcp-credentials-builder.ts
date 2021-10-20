import { GcpCredentialsProvider } from "./models";

/**
 * This class represents a builder to build google cloud credentials
 */
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

    /**
     * Sets the type for your google cloud credentials.
     * Found in your key service json file given by google cloud
     * {"type": value }
     * @param type String with the type value
     */
    setType(type: string): this {
        this.type = type;
        return this;
    }

    /**
     * Sets the project id for your google cloud credentials.
     * Found in your key service json file given by google cloud
     * {"project_id": value }
     * @param projectId String with the projectId value
     */
    setProjectId(projectId: string): this {
        this.projectId = projectId;
        return this;
    }

    /**
     * Sets the private key id for your google cloud credentials.
     * Found in your key service json file given by google cloud
     * {"private_key_id": value }
     * @param privateKeyId String with the private key id value
     */
    setPrivateKeyId(privateKeyId: string): this {
        this.privateKeyId = privateKeyId;
        return this;
    }

    /**
     * Sets the private key for your google cloud credentials.
     * Found in your key service json file given by google cloud
     * {"private_key": value }
     * @param privateKey String with the private key value
     */
    setPrivateKey(privateKey: string): this {
        this.privateKey = privateKey;
        return this;
    }

    /**
     * Sets the client email value for your google cloud credentials.
     * Found in your key service json file given by google cloud
     * {"client_email": value }
     * @param email String with the client email value
     */
    setEmail(email: string): this {
        this.email = email;
        return this;
    }

    /**
     * Sets the client id value for your google cloud credentials.
     * Found in your key service json file given by google cloud
     * {"client_id": value }
     * @param clientId String with the client id value
     */
    setClientId(clientId: string): this {
        this.clientId = clientId;
        return this;
    }

    /**
     * Sets the auth uri value for your google cloud credentials.
     * Found in your key service json file given by google cloud
     * {"auth_uri": value }
     * @param authUri String with the auth uri value
     */
    setAuthUri(authUri: string): this {
        this.authUri = authUri;
        return this;
    }

    /**
     * Sets the token uri value for your google cloud credentials.
     * Found in your key service json file given by google cloud
     * {"token_uri": value }
     * @param tokenUri String with the token uri value
     */
    setTokenUri(tokenUri: string): this {
        this.tokenUri = tokenUri;
        return this;
    }

    /**
     * Sets the cert provider url value for your google cloud credentials.
     * Found in your key service json file given by google cloud
     * {"auth_provider_x509_cert_url": value }
     * @param certProvider String with the Cert Provider URL
     */
    setCertProvider(certProvider: string): this {
        this.certProvider = certProvider;
        return this;
    }

    /**
     * Sets the cert url value for your google cloud credentials.
     * Found in your key service json file given by google cloud
     * {"client_x509_cert_url": value }
     * @param certUrl String with the Cert URL
     */
    setCertUrl(certUrl: string): this {
        this.certUrl = certUrl;
        return this;
    }

    /**
     * Builds a {@Link GcpCredentialsProvider} with all the information needed for cloud authentication
     */
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

    /**
     * Gets an instance of this builder
     */
    static getBuilder(): GcpCredentialsBuilder {
        return new GcpCredentialsBuilder();
    }

}
