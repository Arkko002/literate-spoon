import database from "../../db/db";
import server from "../../server/server";
import { Command } from "../command";
import { CommandEvent, CommandEventHandler } from "../handler/handler";

const getHandler: CommandEventHandler = (event: CommandEvent): void => {
  // TODO: Placeholder function with no proper args and flags handling
  let value = database.get(event.args[0]);

  // TODO: Create output event
  if (value.isOk()) server.write(value.value, event.connectionId);
  else if (value.isErr()) {
  } // TODO: Handle error
};

export const Get: Command = Object.freeze({
  name: "GET",
  arity: 2,
  arguments: [],
  subcommands: [],
  handler: getHandler,
});
