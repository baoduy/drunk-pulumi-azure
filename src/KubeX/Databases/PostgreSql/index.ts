import PostgreSQLHA from './PostgreSQL-HA';
import PostgreSQL from './PostgreSQL';
import { PostgreSqlProps } from '../../types';

export default ({
  enableHA,
  ...others
}: PostgreSqlProps & { enableHA?: boolean }) =>
  enableHA ? PostgreSQLHA(others) : PostgreSQL(others);
