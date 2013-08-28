/*
 * Copyright (c) 2012 Continuuity Inc. All rights reserved.
 */
package com.continuuity.data.runtime;

import com.continuuity.common.conf.CConfiguration;
import com.continuuity.common.conf.Constants;
import com.continuuity.data.DataSetAccessor;
import com.continuuity.data.LocalDataSetAccessor;
import com.continuuity.data.engine.hypersql.HyperSQLAndMemoryOVCTableHandle;
import com.continuuity.data.engine.leveldb.LevelDBAndMemoryOVCTableHandle;
import com.continuuity.data.engine.memory.oracle.MemoryStrictlyMonotonicTimeOracle;
import com.continuuity.data.operation.executor.OperationExecutor;
import com.continuuity.data.operation.executor.omid.OmidTransactionalOperationExecutor;
import com.continuuity.data.operation.executor.omid.TimestampOracle;
import com.continuuity.data.operation.executor.omid.TransactionOracle;
import com.continuuity.data.operation.executor.omid.memory.MemoryOracle;
import com.continuuity.data.table.OVCTableHandle;
import com.continuuity.data2.queue.QueueClientFactory;
import com.continuuity.data2.transaction.TransactionSystemClient;
import com.continuuity.data2.transaction.inmemory.InMemoryTxSystemClient;
import com.continuuity.data2.transaction.queue.QueueAdmin;
import com.continuuity.data2.transaction.queue.leveldb.LevelDBAndInMemoryQueueAdmin;
import com.continuuity.data2.transaction.queue.leveldb.LevelDBAndInMemoryQueueClientFactory;
import com.google.inject.AbstractModule;
import com.google.inject.Singleton;
import com.google.inject.name.Names;

import java.io.File;
import java.util.Properties;

/**
 * DataFabricLocalModule defines the Local/HyperSQL bindings for the data fabric.
 */
public class DataFabricLocalModule extends AbstractModule {

  private final CConfiguration conf;
  private final String hyperSqlJDCBString;

  public DataFabricLocalModule() {
    this(CConfiguration.create());
  }

  public DataFabricLocalModule(CConfiguration conf) {
    this.conf = conf;

    String path = conf.get(Constants.CFG_DATA_LEVELDB_DIR);
    if (path == null || path.isEmpty()) {
      path =
        System.getProperty("java.io.tmpdir") +
          System.getProperty("file.separator") +
          "ldb-test-" + Long.toString(System.currentTimeMillis());
      conf.set(Constants.CFG_DATA_LEVELDB_DIR, path);
    }

    File p = new File(path);
    if (!p.exists() && !p.mkdirs()) {
      throw new RuntimeException("Unable to create directory for ldb");
    }
    p.deleteOnExit();


    this.hyperSqlJDCBString = conf.get("data.local.jdbc",
        "jdbc:hsqldb:file:" +
        System.getProperty("java.io.tmpdir") +
        System.getProperty("file.separator") + "fabricdb;user=sa");
  }

  public DataFabricLocalModule(String hyperSqlJDBCString,
      @SuppressWarnings("unused") Properties hyperSqlProperties) {
    this.conf = CConfiguration.create();
    this.hyperSqlJDCBString = hyperSqlJDBCString;
  }

  @Override
  public void configure() {

    // Load any necessary drivers
    loadHsqlDriver();

    // Bind our implementations

    // There is only one timestamp oracle for the whole system
    bind(TimestampOracle.class).to(MemoryStrictlyMonotonicTimeOracle.class).in(Singleton.class);
    bind(TransactionOracle.class).to(MemoryOracle.class).in(Singleton.class);

    // This is the primary mapping of the data fabric to underlying storage
    bind(OVCTableHandle.class).to(HyperSQLAndMemoryOVCTableHandle.class);

    bind(OperationExecutor.class).
        to(OmidTransactionalOperationExecutor.class).in(Singleton.class);

    // Bind TxDs2 stuff
    bind(DataSetAccessor.class).to(LocalDataSetAccessor.class).in(Singleton.class);
    bind(TransactionSystemClient.class).to(InMemoryTxSystemClient.class).in(Singleton.class);
    bind(QueueClientFactory.class).to(LevelDBAndInMemoryQueueClientFactory.class).in(Singleton.class);
    bind(QueueAdmin.class).to(LevelDBAndInMemoryQueueAdmin.class).in(Singleton.class);
    bind(CConfiguration.class).annotatedWith(Names.named("LevelDBConfiguration")).toInstance(conf);

    // Bind named fields
    bind(String.class)
        .annotatedWith(Names.named("HyperSQLOVCTableHandleJDBCString"))
        .toInstance(hyperSqlJDCBString);

    bind(CConfiguration.class).annotatedWith(Names.named("DataFabricOperationExecutorConfig")).toInstance(conf);
  }

  private void loadHsqlDriver() {
    try {
      Class.forName("org.hsqldb.jdbcDriver");
    } catch (Exception e) {
      System.err.println("ERROR: failed to load HSQLDB JDBC driver.");
      e.printStackTrace();
      throw new RuntimeException(e);
    }
  }

} // end of DataFabricLocalModule
