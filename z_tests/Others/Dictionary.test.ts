import { expect } from "chai";
import { Dictionary } from "../../Tools/Dictionary";

describe("Dictionary", () => {
  it("should add and retrieve items correctly", () => {
    const dictionary = new Dictionary<string>();
    dictionary.add("key1", "value1");
    dictionary.add("key2", "value2");

    expect(dictionary.getValue("key1")).to.equal("value1");
    expect(dictionary.getValue("key2")).to.equal("value2");
  });

  it("should update items correctly", () => {
    const dictionary = new Dictionary<string>();
    dictionary.add("key1", "value1");
    expect(dictionary.getValue(0)).to.equal("value1");
  });

  it("should remove items correctly", () => {
    const dictionary = new Dictionary<string>();
    dictionary.add("key1", "value1");
    expect(dictionary.remove("key1")).to.be.true;

    expect(dictionary.getValue("key1")).to.be.undefined;
  });

  it("should return the correct size", () => {
    const dictionary = new Dictionary<string>();
    dictionary.add("key1", "value1");
    dictionary.add("key2", "value2");

    expect(dictionary.size).to.equal(2);
  });
});
