/*
 * Copyright © 2019 Cask Data, Inc.
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

import * as React from 'react';
import 'jsplumb';
import { INode, IConnection } from 'components/DAG/DAGProvider';
import { List, fromJS } from 'immutable';
import uuidV4 from 'uuid/v4';
import withStyles, { WithStyles, StyleRules } from '@material-ui/core/styles/withStyles';

const styles = (theme): StyleRules => {
  return {
    root: {
      height: 'inherit',
      position: 'absolute',
      width: 'inherit',
      '& circle': {
        fill: 'none',
        stroke: 'none',
      },
    },
  };
};

const DAG_CONTAINER_ID = `dag-${uuidV4()}`;

export interface IEndPointArgs {
  element: HTMLElement | null;
  params?: EndpointParams;
  referenceParams?: EndpointParams;
}

export interface IInitNodeProps {
  nodeId: string;
  endPointParams?: IEndPointArgs[];
  makeSourceParams?: any;
  makeTargetParams?: any;
  validConnectionHandler?: IValidationConnectionListenerMap;
}

export interface IRegisterTypesProps {
  connections: {
    [anyProp: string]: any;
  };
  endpoints: {
    [anyProp: string]: any;
  };
}

export interface INodeComponentProps extends INode {
  initNode?: (initConfig: IInitNodeProps) => void;
  onDelete?: (nodeId: string) => void;
}

interface IDAGRendererProps extends WithStyles<typeof styles> {
  nodes: List<INode>;
  connections: List<IConnection>;
  onConnection: (connection) => void;
  onConnectionDetached: (connection) => void;
  onDeleteNode: (nodeId: string) => void;
  jsPlumbSettings: object;
  registerTypes?: IRegisterTypesProps;
}

interface IConnectionObjWithDOM {
  source: HTMLElement;
  target: HTMLElement;
}

interface IConnectionObj extends IConnection {
  connection: IConnectionObjWithDOM;
}

type IValidationConnectionListener = (connectionObj: IConnectionObj) => boolean;
interface IValidationConnectionListenerMap {
  validationListener: IValidationConnectionListener;
  type: string;
}

class DAGRendererComponent extends React.Component<IDAGRendererProps, any> {
  public state = {
    isJsPlumbInstanceCreated: false,
    jsPlumbInstance: jsPlumb.getInstance(this.props.jsPlumbSettings || {}),
  };

  public static validConnectionListeners: IValidationConnectionListenerMap[] = [];

  public componentDidMount() {
    jsPlumb.ready(() => {
      const jsPlumbInstance = jsPlumb.getInstance({
        Container: DAG_CONTAINER_ID,
      });
      jsPlumbInstance.setContainer(document.getElementById(DAG_CONTAINER_ID));
      jsPlumbInstance.bind('connection', (connObj: IConnection, originalEvent: boolean) => {
        if (!originalEvent) {
          return;
        }
        const newConnObj = this.getNewConnectionObj(fromJS(connObj));
        this.props.onConnection(newConnObj);
      });
      jsPlumbInstance.bind('connectionDetached', (connObj: IConnection, originalEvent: boolean) => {
        if (!originalEvent) {
          return;
        }
        const newConnObj = this.getNewConnectionObj(fromJS(connObj));
        this.props.onConnectionDetached(newConnObj);
      });
      jsPlumbInstance.bind('beforeDrop', this.checkForValidIncomingConnection);
      this.registerTypes(jsPlumbInstance);
      this.setState({
        isJsPlumbInstanceCreated: true,
        jsPlumbInstance,
      });
    });
  }

  private registerTypes = (jsPlumbInstance: jsPlumbInstance) => {
    if (typeof this.props.registerTypes === 'undefined') {
      return;
    }
    const { connections, endpoints } = this.props.registerTypes;
    if (Object.keys(connections).length) {
      jsPlumbInstance.registerConnectionTypes(connections);
    }
    if (Object.keys(endpoints).length) {
      jsPlumbInstance.registerEndpointTypes(endpoints);
    }
  };

  public addEndpoint = (
    element: HTMLElement | null,
    params: EndpointParams = {},
    referenceParams: EndpointParams = {}
  ) => {
    if (!element) {
      return;
    }
    const jsPlumbEndpoint = this.state.jsPlumbInstance.addEndpoint(
      element,
      params,
      referenceParams
    );
    this.addListenersForEndpoint(jsPlumbEndpoint, element);
  };

  public addHoverListener = (endpoint, domCircleEl, labelId) => {
    if (!domCircleEl.classList.contains('hover')) {
      domCircleEl.classList.add('hover');
    }
    if (labelId) {
      endpoint.showOverlay(labelId);
    }
  };

  public removeHoverListener = (endpoint, domCircleEl, labelId) => {
    if (domCircleEl.classList.contains('hover')) {
      domCircleEl.classList.remove('hover');
    }
    if (labelId) {
      endpoint.hideOverlay(labelId);
    }
  };

  // TODO: labelId will be used on nodes with endpoints that have labels (condition, error, alert etc.,)
  public addListenersForEndpoint = (endpoint, domCircleEl, labelId = null) => {
    endpoint.canvas.removeEventListener('mouseover', this.addHoverListener);
    endpoint.canvas.removeEventListener('mouseout', this.removeHoverListener);
    endpoint.canvas.addEventListener(
      'mouseover',
      this.addHoverListener.bind(this, endpoint, domCircleEl, labelId)
    );
    endpoint.canvas.addEventListener(
      'mouseout',
      this.removeHoverListener.bind(this, endpoint, domCircleEl, labelId)
    );
  };

  public makeNodeDraggable = (id: string) => {
    this.state.jsPlumbInstance.draggable(id);
  };

  public makeConnections = () => {
    if (!this.state.jsPlumbInstance) {
      return;
    }
    this.props.connections.forEach((connObj) => {
      const newConnObj = this.getNewConnectionObj(connObj).toJSON();
      if (
        (this.state.jsPlumbInstance.getEndpoints(newConnObj.sourceId).length ||
          this.state.jsPlumbInstance.isSource(newConnObj.sourceId)) &&
        (this.state.jsPlumbInstance.getEndpoints(newConnObj.targetId).length ||
          this.state.jsPlumbInstance.isTarget(newConnObj.targetId))
      ) {
        newConnObj.source = newConnObj.sourceId;
        newConnObj.target = newConnObj.targetId;
        this.state.jsPlumbInstance.connect(newConnObj);
      }
    });
  };

  /**
   * Creates a new connection: IConnection object with sourceId and targetId.
   *
   * i/o: Map(Connection)
   * o/p: Map(Connection)
   */
  public getNewConnectionObj = (connObj: IConnection): IConnection => {
    if (connObj.data) {
      return fromJS({
        data: connObj.get('data') || {},
        sourceId: connObj.get('sourceId'),
        targetId: connObj.get('targetId'),
      });
    }
    return fromJS({
      sourceId: connObj.get('sourceId'),
      targetId: connObj.get('targetId'),
    });
  };

  public initNode = ({
    nodeId,
    endPointParams = [],
    makeSourceParams = {},
    makeTargetParams = {},
    validConnectionHandler,
  }: IInitNodeProps) => {
    endPointParams.map((endpoint) => {
      const { element, params, referenceParams } = endpoint;
      this.addEndpoint(element, params, referenceParams);
    });
    if (Object.keys(makeSourceParams).length) {
      this.state.jsPlumbInstance.makeSource(nodeId, makeSourceParams);
    }
    if (Object.keys(makeTargetParams).length) {
      this.state.jsPlumbInstance.makeTarget(nodeId, makeTargetParams);
    }
    this.makeNodeDraggable(nodeId);
    if (validConnectionHandler) {
      if (
        DAGRendererComponent.validConnectionListeners.find(
          (listener) => listener.type === validConnectionHandler.type
        )
      ) {
        return;
      }
      DAGRendererComponent.validConnectionListeners.push(validConnectionHandler);
    }
  };

  private checkForValidIncomingConnection = (connObj: IConnectionObj) => {
    const sourceNode = document.getElementById(connObj.sourceId);
    let sourceNodeType;
    if (sourceNode) {
      sourceNodeType = sourceNode.getAttribute('data-node-type');
    }
    const targetNode = document.getElementById(connObj.targetId);
    let targetNodeType;
    if (targetNode) {
      targetNodeType = targetNode.getAttribute('data-node-type');
    }
    const listeners = DAGRendererComponent.validConnectionListeners
      .filter((l) => [sourceNodeType, targetNodeType].indexOf(l.type) !== -1)
      .map((l) => l.validationListener);
    return listeners.reduce((prev, curr) => prev && curr(connObj), true);
  };

  private renderChildren() {
    if (!this.state.isJsPlumbInstanceCreated) {
      return '...loading';
    }

    return React.Children.map(this.props.children, (child: React.ReactElement) => {
      if (
        typeof child === 'string' ||
        typeof child === 'number' ||
        child === null ||
        typeof child === 'undefined' ||
        typeof child === 'boolean'
      ) {
        return child;
      }

      // huh.. This is not how it should be.
      return React.cloneElement(child as React.ReactElement, {
        ...child.props,
        id: child.props.id,
        initNode: this.initNode,
        key: child.props.id,
        onDelete: this.props.onDeleteNode,
      });
    });
  }

  public render() {
    const { classes } = this.props;
    return (
      <div style={{ position: 'relative' }}>
        <div id={DAG_CONTAINER_ID} className={classes.root}>
          {this.renderChildren()}
        </div>
      </div>
    );
  }
}

const DAGRenderer = withStyles(styles)(DAGRendererComponent);
export { DAGRenderer };
