import {InternalAuthGuard} from "../modules/commons/guards/internal-auth.guard";
import {OnlyDevGuard} from "../modules/commons/guards/only-dev.guard";

describe('Test guards', () => {

    const guard = new InternalAuthGuard();

    const generateAuthGuard = (queryPassword: string, envPassword: string) => {
        process.env["INTERNAL_ENDPOINT_PASSWORD"] = envPassword;
        return guard.canActivate({
            // @ts-ignore
            switchToHttp() {
                return {
                    getRequest() {
                        return {
                            query: {
                                internalSecret: queryPassword
                            }
                        }
                    }
                }
            }
        });
    }

   test('internal auth guard', () => {
       const canActivate = generateAuthGuard('ABCD', 'ABCD');
       expect(canActivate).toBeTruthy();
   });

    test('internal auth guard different values', () => {
        const canActivate = generateAuthGuard('ABCD', 'ABCDE');
        expect(canActivate).toBeFalsy();
    });

    test('Dev guard only true', () => {
        const guard = new OnlyDevGuard();
        process.env["STATUS"] = "DEV";
        // @ts-ignore
        expect(guard.canActivate({})).toBeTruthy()
    })

    test('Dev guard only false', () => {
        const guard = new OnlyDevGuard();
        process.env["STATUS"] = "PROD";
        // @ts-ignore
        expect(guard.canActivate({})).toBeFalsy()
    })

});
