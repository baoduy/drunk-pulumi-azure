import * as common from "../../Common/Helpers";
import { expect } from "chai";

describe("Helpers tests", () => {
  it("Get root domain from sub domain", () => {
    const name = common.getRootDomainFromUrl("test.drunkcoding.net");
    expect(name).to.be.equal("drunkcoding.net");
  });

  it("Get root domain from http url", () => {
    const name = common.getRootDomainFromUrl(
      "http://test.drunkcoding.net/hello"
    );
    expect(name).to.be.equal("drunkcoding.net");
  });

  it("Get root domain from https url", () => {
    const name = common.getRootDomainFromUrl(
      "https://test.drunkcoding.net/hello"
    );
    expect(name).to.be.equal("drunkcoding.net");
  });

  it("Get domain from https url", () => {
    const name = common.getDomainFromUrl("https://test.drunkcoding.net/hello");
    expect(name).to.be.equal("test.drunkcoding.net");
  });

  it("shallowEquals 2 Objects", () => {
    const rs = common.shallowEquals({ a: "123" }, { a: `123` });
    expect(rs).to.be.true;
  });

  it("RangeOf Test", () => {
    const rs = common.RangeOf(3);
    expect(rs.length).to.be.equal(3);
    expect(rs[0]).to.be.equal(0);
  });
});
