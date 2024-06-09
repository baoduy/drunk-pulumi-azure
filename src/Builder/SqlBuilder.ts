import { Builder, BuilderProps, ISqlBuilder, SqlBuilderResults } from "./types";

class SqlBuilder extends Builder<SqlBuilderResults> implements ISqlBuilder {
  constructor(props: BuilderProps) {
    super(props);
  }

  public build() {
    return {};
  }
}
