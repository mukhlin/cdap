/*
 * Copyright © 2020 Cask Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
*/

import { loginIfRequired, getArtifactsPoll } from '../helpers';
import { INodeInfo } from '../typings';
import {
  propertySelector,
  rowSelector,
  openPropertyModal,
  getExportProperties,
} from '../support/MultiRowWidgets/utilities';

let headers = {};

describe('KeyValue Widgets', () => {
  // Uses API call to login instead of logging in manually through UI
  before(() => {
    loginIfRequired().then(() => {
      cy.getCookie('CDAP_Auth_Token').then((cookie) => {
        if (!cookie) {
          return;
        }
        headers = {
          Authorization: 'Bearer ' + cookie.value,
        };
      });
    });
  });

  before(() => {
    cy.visit('/pipelines/ns/default/studio');
    const projection: INodeInfo = { nodeName: 'Projection', nodeType: 'transform' };

    // add plugin to canvas
    cy.open_transform_panel();
    cy.add_node_to_canvas(projection);
  });

  beforeEach(() => {
    getArtifactsPoll(headers);
  });

  const property = 'rename';

  it('Should render KeyValue row', () => {
    openPropertyModal();
    cy.get(propertySelector(property)).should('exist');
    cy.get(rowSelector(property, 0)).should('exist');
    cy.get(rowSelector(property, 1)).should('not.exist');
  });

  it('Should add a new row', () => {
    cy.get(`${rowSelector(property, 0)} .add-row`).click();
    cy.get(`${rowSelector(property, 1)}`).should('exist');
  });

  it('Should input property', () => {
    cy.get(`${rowSelector(property, 0)} .key`).type('key1');
    cy.get(`${rowSelector(property, 0)} .value`).type('value1');
    cy.get(`${rowSelector(property, 1)} .key`).type('key2');
    cy.get(`${rowSelector(property, 1)} .value`).type('value2');

    cy.get('[data-testid="close-config-popover"]').click();
    cy.get('[data-cy="pipeline-export-btn"]').click();
    getExportProperties('Projection').then((properties) => {
      expect(properties[property]).equals('key1:value1,key2:value2');
    });

    cy.get('[data-cy="export-pipeline-close-modal-btn"]').click();
  });

  it('Should re-render existing property', () => {
    openPropertyModal();
    cy.get(`${rowSelector(property, 0)}`).should('exist');
    cy.get(`${rowSelector(property, 1)}`).should('exist');
    cy.get(`${rowSelector(property, 0)} .key input`)
      .invoke('val')
      .then((val) => {
        expect(val).equals('key1');
      });
    cy.get(`${rowSelector(property, 0)} .value input`)
      .invoke('val')
      .then((val) => {
        expect(val).equals('value1');
      });
    cy.get(`${rowSelector(property, 1)} .key input`)
      .invoke('val')
      .then((val) => {
        expect(val).equals('key2');
      });
    cy.get(`${rowSelector(property, 1)} .value input`)
      .invoke('val')
      .then((val) => {
        expect(val).equals('value2');
      });
  });

  it('Should delete property', () => {
    cy.get(`${rowSelector(property, 1)} .remove-row`).click();
    cy.get(`${rowSelector(property, 1)}`).should('not.exist');

    cy.get('[data-testid="close-config-popover"]').click();
    cy.get('[data-cy="pipeline-export-btn"]').click();
    getExportProperties('Projection').then((properties) => {
      expect(properties[property]).equals('key1:value1');
    });

    cy.get('[data-cy="export-pipeline-close-modal-btn"]').click();
  });
});
