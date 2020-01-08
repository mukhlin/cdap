/*
 * Copyright © 2020 Cask Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

export function propertySelector(property) {
  return `[data-cy="${property}"]`;
}

export function rowSelector(property, index) {
  return `${propertySelector(property)} [data-cy="${index}"]`;
}

export function openPropertyModal() {
  // open plugin properties
  cy.get('[data-cy="plugin-node-Projection-transform-0"] .node .node-configure-btn')
    .invoke('show')
    .click();
}

export function getExportProperties(stageName) {
  return new Promise((resolve) => {
    cy.get('textarea[data-cy="pipeline-export-json-container"]')
      .invoke('val')
      .then((va) => {
        if (typeof va !== 'string') {
          throw new Error('Unable to get pipeline config');
        }
        let pipelineConfig;
        try {
          pipelineConfig = JSON.parse(va);
        } catch (e) {
          throw new Error('Invalid pipeline config');
        }
        const stages = pipelineConfig.config.stages;
        const transform = stages.find((stage) => stage.name === stageName);
        const properties = transform.plugin.properties;
        resolve(properties);
      });
  });
}
