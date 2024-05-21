// import { Command, MaximumOneOf } from "../command";
// import { CommandEvent, CommandEventHandler } from "../handler/handler";

// TODO: Handle argument positioning programatically for now
// TODO: Confirmed that MaximumOneOf is only compile time check, it wont work for runtime RESP command parsing?
// const setHandler: CommandEventHandler = (event: CommandEvent): any => {};
//
// export const Set: Command = Object.freeze({
//   name: "SET",
//   arity: -3,
//   arguments: [],
//   subcommands: [],
//   handler: setHandler,
// });
//
// type SetTTL = MaximumOneOf<{
//   EX: number;
//   PX: number;
//   EXAT: number;
//   PXAT: number;
//   KEEPTTL: true;
// }>;
//
// type SetGuards = MaximumOneOf<{
//   NX: true;
//   XX: true;
// }>;
//
// interface SetCommonOptions {
//   GET?: true;
// }
//
// type SetOptions = SetTTL & SetGuards & SetCommonOptions;
