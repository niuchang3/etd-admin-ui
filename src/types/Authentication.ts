
interface Token {
    tokenType: string,
    tokenValue: string,
    expired:number
}


interface Authentication {
    accessToken: Token;
    refreshToken: Token | undefined;
}