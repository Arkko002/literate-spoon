import { Err, Ok, RedosError, Result } from "../../error-handling";
import { StreamErrorKind } from "./stream.error";

// TODO: https://en.wikipedia.org/wiki/Radix_tree
// TODO: Rework operations to fit the stream use cases better
export class EntryTree {
  private root: EntryNode;
  public elements: number = 0;

  public constructor(rootValue: string) {
    this.root = new EntryNode(rootValue, null);
  }

  // TODO: Get elements with bigger ID than provided
  public lookup(value: string): Result<EntryNode, RedosError> {
    let traverseNode: EntryNode = this.root;
    let elementsFound: number = 0;

    while (!traverseNode.isLeaf() && elementsFound < value.length) {
      let valueSuffix: string = value.substring(elementsFound);

      for (const child of traverseNode.children) {
        if (child.value.startsWith(valueSuffix)) {
          traverseNode = child;
          elementsFound += child.value.length;
        }
      }

      break;
    }

    // NOTE: isLeaf check will hold for constant length identifiers
    if (traverseNode.isLeaf() && elementsFound === value.length) {
      return Ok(traverseNode);
    }

    return Err(
      new RedosError(
        `Value not found in radix tree: ${value}`,
        StreamErrorKind.VALUE_NOT_FOUND,
      ),
    );
  }
  public insert(value: string): void {
    let traverseNode: EntryNode = this.root;
    let elementsFound: number = 0;

    // TODO: Condition
    while (true) {
      let valueSuffix: string = value.substring(elementsFound);

      // NOTE: IDs are guaranteed unique, don't need to handle the case of 2 equal values
      for (const child of traverseNode.children) {
        if (child.value.startsWith(valueSuffix)) {
          if (child.value.length > valueSuffix.length) {
            traverseNode = child;

            const commonPrefix: string = this.findCommanPrefix(
              child.value,
              valueSuffix,
            );

            this.splitNode(traverseNode, commonPrefix);
            this.elements++;

            return;
          } else {
            traverseNode = child;
            elementsFound += child.value.length;
          }
        }
      }
      traverseNode.children.push(new EntryNode(valueSuffix, traverseNode));
      this.elements++;
    }
  }

  // TODO:
  public delete(value: string): void {
    this.elements--;
  }

  private splitNode(
    node: EntryNode,
    prefix: string,
  ): Result<EntryNode, RedosError> {
    if (node.value.startsWith(prefix)) {
      let newValue = node.value.substring(0, prefix.length - 1);
      let newChildValue = node.value.substring(prefix.length);

      let newNode = new EntryNode(newValue, node.parent);
      let newChildNode = new EntryNode(newChildValue, newNode);
      newNode.children.push(newChildNode);

      return Ok(newNode);
    }

    return Err(
      new RedosError(
        `Couldn't split radix node, value doesn't start with prefix`,
        StreamErrorKind.PREFIX_NOT_IN_VALUE,
      ),
    );
  }

  private findCommanPrefix(a: string, b: string): string {
    let commonPrefix = "";
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        return commonPrefix;
      }

      commonPrefix += a[i];
    }

    return commonPrefix;
  }
}

export class EntryNode {
  public value: string;
  public parent: EntryNode | null;
  public children: EntryNode[];

  public constructor(value: string, parent: EntryNode | null) {
    this.value = value;
    this.parent = parent;
    this.children = [];
  }

  public isLeaf(): boolean {
    return this.children.length === 0;
  }
}
