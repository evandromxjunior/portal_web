import oracledb from "oracledb";

import { assertOracleConfig, config } from "../config.js";

let pool: oracledb.Pool | undefined;

export async function getOraclePool() {
  if (pool) {
    return pool;
  }

  assertOracleConfig();

  pool = await oracledb.createPool({
    user: config.oracle.user,
    password: config.oracle.password,
    connectString: config.oracle.connectString,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1
  });

  return pool;
}

export async function closeOraclePool() {
  if (!pool) {
    return;
  }

  await pool.close(10);
  pool = undefined;
}
