declare module "bcryptjs" {
  const bcrypt: {
    hash: (data: string, salt: number) => Promise<string>;
    compare: (data: string, hash: string) => Promise<boolean>;
    hashSync: (data: string, salt: number) => string;
    compareSync: (data: string, hash: string) => boolean;
  };
  export default bcrypt;
}
declare module "jsonwebtoken" {
  const jwt: {
    sign: (payload: any, secret: string, options?: any) => string;
    verify: (token: string, secret: string) => any;
  };
  export default jwt;
}
