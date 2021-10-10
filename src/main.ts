import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {loadGlobals} from "./load-globals";

loadGlobals();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

bootstrap();
//
// import {WorkerPool} from "./inc/worker-pool/worker-pool";
// import * as dotenv from "dotenv";
//
// dotenv.config();
// const workerPool = new WorkerPool({
//   size: 1,
//   contractsPerWorker: 1,
//   autoScale: true
// });
//
// function clock(start?: any) {
//   if ( !start ) return process.hrtime();
//   var end = process.hrtime(start);
//   return Math.round((end[0]*1000) + (end[1]/1000000));
// }
//
// let contracts =
//     ["-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ",
//       "cl2y1SZ68UoGByXYgjlEoCy6uP3kK1Ei4l2EPAHNU3w",
//       "93t8kaszPPVKvl6zXvsb9gK1yzCJNyUNUQ5fNKPTDAc",
//       "z1CqaCjoHmvgDffod_IVSsoUakjnI9GSItpXfSr58Ic",
//       "tgDclUrJ-GN9kx7fTBVKXG7tCAhB2ZkS0Uc4nGsLMLY",
//       "ofFqPzPWa4YNzwZuH85pVsIyUX55aevbkyGp02bEIEc",
//       "OvtteYAf6gfoTvGIcV2cGVa8iHMJmzioag28EfxIe3Y",
//       "XSgxfXVZuinEt0nJkQksuPxmSYuAYlkH2BBWcyl-ePs",
//       "UVVrfpNI2nO9U37HOLMIx590_RaWzZk4iXMk55XA7GY",
//       "sew_MAXZIgmyEPzzOTkdAca7SQCL9XTCMfxY3KOE5-M",
//       "pQD1kV9ZLO_XcmXS1d98jUQEm58a9tSQI_-AwNDdRQo",
//       "TnReipqbYORtHfuOiWKftmn0m4OYDBpwsCckyv7psio",
//       "IDYS--h_9iqfH_iNEe0Y-uUqejY-85uK5vn2hJAhfuA",
//       "GirFtyB_PI4oQXhEFrHZLpFUqincHrDdDxPaQ1M8r00",
//       "wb6I5TAWw9l1XcZH0x99pZbgBrZ_Ttbo65CDT9zgEZc",
//       "WggkHTasal3WCz1sqOekpx0FzI1tP8vxQgwXkFtbltc",
//       "lDo_75uFD8nfe9aX1QS_EJlbyCofk59qqvLjTmRiDuI",
//       "dLVV5yJ2FzY2U_t5TsW5G_qyDWhQJ3_BrUYlw7aSmJY",
//       "3UZVBdPjnxaZkEBCEj4Zlre-yG_5VpWPZwE3WjMdoyo",
//       "deXX5M_oTr02soT217ZYH1WjotUadFbAb48JddyYmf4",
//       "HfPwu4ToLD1Na6tbHSEZhx33uKLBxRPpPo-1xO2dy-A",
//       "DwoonnbdaUK8wNHCGEdbDi6q7PFqgmkvFtS5pFAYv94",
//       "D2o7h18f0GdfsSmpahb-TLbc1xhutrimwH7In0g5lmA",
//       "jKPlhtYF-by5eLJkNjTn97gVCLW_MAuDqxaypn2f6Lo",
//       "ZIngC71ZGAD2PFuosKLmI-8x-_Qvytsu047iNkpAhDE",
//       "Cu0FeGOQXmVFOfP4Fbpqdvy2dccDKlxi42ZFbGdCheA",
//       "sMLPiVKQ8xMLJU7M1PUiH-8v_f0-0sBzkS6foLJoV_M",
//       "I_aAD4xbx2L_DUlC6mp_WOJ8buASDxbg3_9MMTyKTro",
//       "B0s8KIzeOqZxLO8l8aTPMRfxAn-WjwSyP_2qy0bUZTY"
//     ];
//
// const startLength = contracts.length;
// const promises = [];
//
// var start = clock();
//
// for(const contract of contracts) {
//   promises.push(workerPool.processContractInWorker(contract, true));
// }
//
// Promise.allSettled(promises).then((results) => {
//     var duration = clock(start);
//     const fulfilled = results.filter(item => item.status === 'fulfilled').length;
//     console.log(`Took ${duration}ms for ${fulfilled}/${startLength}`);
//     results.forEach((item) => {
//       console.log(item);
//     })
// })
//
// // var start = clock();
// // (async () => {
// //   for(const contract of contracts) {
// //     try {
// //       console.log(`Contract ${contract}`);
// //       await contractService.processState(contract);
// //       console.log(`Finished`);
// //     } catch(ex) {
// //       contracts = contracts.filter(item => item !== contract);
// //     }
// //   }
// // })().then(() => {
// //   var duration = clock(start);
// //   console.log(`Took ${duration}ms for ${contracts.length}/${startLength}`);
// // });

