import database from "../../db/db";
import { Command } from "../command";
import { CommandEvent, CommandEventHandler } from "../handler/handler";

// TODO: Handle argument positioning programatically for now
const setHandler: CommandEventHandler = (event: CommandEvent): void => {
  // TODO: Placeholder function with no proper args and flags handling
  database.set(event.args[0], event.args[1]);

  // TODO: Create output event
};

export const Set: Command = Object.freeze({
  name: "SET",
  arity: -3,
  arguments: [],
  subcommands: [],
  handler: setHandler,
});
