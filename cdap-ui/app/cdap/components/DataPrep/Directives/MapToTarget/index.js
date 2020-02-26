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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import T from 'i18n-react';
import Input from '@material-ui/core/Input';
import LinearProgress from '@material-ui/core/LinearProgress';
import classnames from 'classnames';
import { UncontrolledTooltip } from 'reactstrap';
import { preventPropagation, connectWithStore } from 'services/helpers';
import { setPopoverOffset } from 'components/DataPrep/helper';
import If from 'components/If';
import DataPrepStore from 'components/DataPrep/store';
import ScrollableList from 'components/ScrollableList';
import {
  execute,
  setError,
  loadTargetDataModelFields,
  saveTargetDataModelFields,
  setTargetDataModel,
  setTargetModel
} from 'components/DataPrep/store/DataPrepActionCreator';

require('./MapToTarget.scss');

const PREFIX = 'features.DataPrep.Directives.MapToTarget';

class MapToTarget extends Component {
  static propTypes = {
    isOpen: PropTypes.bool,
    isDisabled: PropTypes.bool,
    column: PropTypes.string,
    onComplete: PropTypes.func,
    close: PropTypes.func,
    dataModelList: PropTypes.array,
    targetDataModel: PropTypes.object,
    targetModel: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      searchText: '',
    };
  }

  componentDidMount() {
    this.calculateOffset = setPopoverOffset.bind(
      this,
      document.getElementById('map-to-target-directive')
    );

    (async () => {
      try {
        await loadTargetDataModelFields();
      } catch (error) {
        setError(error);
      }
    })();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.isOpen && !this.props.isDisabled && this.calculateOffset) {
      this.calculateOffset();
    }
  }

  setLoading(loading) {
    this.setState({
      loading
    });
  }

  clearSearch() {
    this.setState({
      searchText: '',
    });
  }

  applySearch(options) {
    const searchText = this.state.searchText.trim().toUpperCase();
    if (searchText) {
      return options.filter((option) => option.name.toUpperCase().indexOf(searchText) >= 0);
    }
    return options;
  }

  async selectTargetDataModel(dataModel) {
    this.setLoading(true);
    try {
      await setTargetDataModel(dataModel);
      await setTargetModel(null);
      this.clearSearch();
    } catch (error) {
      setError(error, 'Could not set target data model');
    } finally {
      this.setLoading(false);
    }
  }

  async selectTargetModel(model) {
    this.setLoading(true);
    try {
      await setTargetModel(model);
      this.clearSearch();
    } catch (error) {
      setError(error, 'Could not set target model');
    } finally {
      this.setLoading(false);
    }
  }

  async applyDirective(field) {
    const { column, targetDataModel, targetModel } = this.props;
    this.setLoading(true);
    try {
      await saveTargetDataModelFields();

      const directive = 'data-model-map-column ' +
        `'${targetDataModel.url}' '${targetDataModel.id}' ${targetDataModel.revision} ` +
        `'${targetModel.id}' '${field.id}' :${column}`;

      await execute([directive]).toPromise();

      this.props.close();
      this.props.onComplete();
    } catch (error) {
      setError(error, 'Error executing Map to Target directive');
    } finally {
      this.setLoading(false);
    }
  }

  renderDetail() {
    if (!this.props.isOpen || this.props.isDisabled) {
      return null;
    }

    let options, selectFn;
    const selection = [];
    const { dataModelList, targetDataModel, targetModel } = this.props;

    if (targetDataModel) {
      selection.push(
        {
          key: 'datamodel',
          unselectFn: () => (async() => await this.selectTargetDataModel(null))(),
          ...targetDataModel,
        }
      );
      if (targetModel) {
        selection.push(
          {
            key: 'model',
            unselectFn: () => (async () => await this.selectTargetModel(null))(),
            ...targetModel,
          }
        );
        options = this.applySearch(targetModel.fields || []);
        selectFn = (field) => (async () => await this.applyDirective(field))();
      } else {
        options = this.applySearch(targetDataModel.models || []);
        selectFn = (model) => (async () => await this.selectTargetModel(model))();
      }
    } else {
      options = dataModelList || [];
      selectFn = (dataModel) => (async () => await this.selectTargetDataModel(dataModel))();
    }

    return (
      <div className='second-level-popover' onClick={preventPropagation}>
        {selection.length === 0 ? <h5>{T.translate(`${PREFIX}.dataModelPlaceholder`)}</h5> : null}

        {selection.map(item => (
          <div id={`map-to-target-selected-${item.key}`} key={item.key} className='selected-item'>
            <span className='selected-item-name'>{item.name}</span>
            <span className='unselect-icon fa fa-times' onClick={item.unselectFn} />
            <If condition={item.description}>
              <UncontrolledTooltip
                target={`map-to-target-selected-${item.key}`}
                placement='right'
                delay={{ show: 750, hide: 0 }}
              >
                {item.description}
              </UncontrolledTooltip>
            </If>
          </div>
        ))}

        {this.state.loading ? <LinearProgress /> : <hr />}

        <If condition={targetDataModel}>
          <Input
            autoFocus={true}
            type='text'
            className='option-search'
            value={this.state.searchText}
            placeholder={T.translate(`${PREFIX}.searchPlaceholder`)}
            onChange={(event) => {
              this.setState({
                searchText: event.target.value
              });
            }}
          />
        </If>

        <div id='map-to-target-options'>
          <ScrollableList target='map-to-target-options'>
            {options.map((option, index) => (
              <div
                id={`map-to-target-option-${index}`}
                key={option.id}
                className='target-option'
                onClick={() => selectFn(option)}
              >
                {option.name}
                <If condition={option.description}>
                  <UncontrolledTooltip
                    target={`map-to-target-option-${index}`}
                    placement='right'
                    delay={{ show: 750, hide: 0 }}
                  >
                    {option.description}
                  </UncontrolledTooltip>
                </If>
              </div>
            ))}
          </ScrollableList>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div
        id='map-to-target-directive'
        className={classnames('map-to-target-directive clearfix action-item', {
          active: this.props.isOpen && !this.props.isDisabled,
          disabled: this.props.isDisabled,
        })}
      >
        <span>{T.translate(`${PREFIX}.title`)}</span>

        <span className='float-right'>
          <span className='fa fa-caret-right' />
        </span>

        {this.renderDetail()}
      </div>
    );
  }

}

const mapStateToProps = state => {
  const { dataModelList, targetDataModel, targetModel } = state.dataprep;
  return {
    dataModelList,
    targetDataModel,
    targetModel,
  };
};

export default connectWithStore(DataPrepStore, MapToTarget, mapStateToProps);
