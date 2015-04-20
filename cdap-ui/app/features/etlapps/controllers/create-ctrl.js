angular.module(PKG.name + '.feature.etlapps')
  .controller('ETLAppsCreateController', function($scope, MyDataSource, $alert, $bootstrapModal, $state, ETLAppsApiFactory, $filter) {
    var apiFactory = new ETLAppsApiFactory($scope);

    $scope.ETLMetadataTabOpen = true;
    $scope.ETLSourcesTabOpen = true;
    $scope.ETLTransformsTabOpen = true;
    $scope.ETLSinksTabOpen = true;

    // Loading flag to indicate source & sinks have
    // not been loaded yet (after/before choosing an etl template)
    $scope.loadingEtlSourceProps = false;
    $scope.loadingEtlSinkProps = false;
    $scope.onETLTypeSelected = false;

    // List of ETL Sources, Sinks & Transforms
    // for a particular etl template type fetched from backend.
    $scope.etlSources = [];
    $scope.etlSinks = [];
    $scope.etlTransforms = [];

    // Default ETL Templates
    $scope.etlTypes = [
      {
        name: 'Etl Batch',
        type: 'etlbatch'
      },
      {
        name: 'ETL Real Time',
        type: 'realtime'
      }
    ];

    // Metadata Model
    $scope.metadata = {
        name: '',
        description: '',
        type: 'etlbatch'
    };

    // Source, Sink and Transform Models
    $scope.source = {
      name: 'Add a Source',
      properties: {},
      placeHolderSource: true
    };

    $scope.sink = {
      name: 'Add a Sink',
      placeHolderSink: true,
      properties: {}
    };

    $scope.transforms = [{
      name: 'Add a Transforms',
      placeHolderTransform: true,
      properties: {}
    },
    {
      name: 'Add a Transforms',
      placeHolderTransform: true,
      properties: {}
    },
    {
      name: 'Add a Transforms',
      placeHolderTransform: true,
      properties: {}
    }];
    $scope.activePanel = 0;

    $scope.$watch('metadata.type',function(etlType) {
      if (!etlType) return;
      $scope.onETLTypeSelected = true;
      apiFactory.fetchSources(etlType);
      apiFactory.fetchSinks(etlType);
      apiFactory.fetchTransforms(etlType);
    });


    $scope.handleSourceDrop = function(sourceName) {
      if ($scope.source.placeHolderSource) {
        delete $scope.source.placeHolderSource;
      }
      $scope.source.name = sourceName;
      apiFactory.fetchSourceProperties(sourceName);
    };
    $scope.handleTransformDrop = function(transformName) {
      var i,
          filterFilter = $filter('filter'),
          isPlaceHolderExist;
      isPlaceHolderExist = filterFilter($scope.transforms, {placeHolderTransform: true});
      if (isPlaceHolderExist.length) {
        for (i=0; i<$scope.transforms.length; i+=1) {
          if ($scope.transforms[i].placeHolderTransform) {
            $scope.transforms[i].name = transformName;
            delete $scope.transforms[i].placeHolderTransform;
            apiFactory.fetchTransformProperties(transformName, i);
            break;
          }
        }
        if (i === $scope.transforms.length) {
          $scope.transforms.push({
            name: transformName
          });
          apiFactory.fetchTransformProperties(transformName);
        }
      } else {
        $scope.transforms.push({
          name: transformName,
          properties: apiFactory.fetchTransformProperties(transformName)
        });
      }
    };
    $scope.handleSinkDrop = function(sinkName) {
      if ($scope.sink.placeHolderSink) {
        delete $scope.sink.placeHolderSink;
      }
      $scope.sink.name = sinkName;
      apiFactory.fetchSinkProperties(sinkName);
    };

    $scope.editSourceProperties = function() {
      if ($scope.source.placeHolderSource) {
        return;
      }
      $bootstrapModal.open({
        templateUrl: '/assets/features/etlapps/templates/create/sourceProperties.html',
        scope: $scope,
        backdrop: true,
        keyboard: true
      });
    };
    $scope.editSinkProperties = function() {
      if ($scope.sink.placeHolderSink) {
        return;
      }
      $bootstrapModal.open({
        templateUrl: '/assets/features/etlapps/templates/create/sinkProperties.html',
        scope: $scope,
        backdrop: true,
        keyboard: true

      });
    };

    $scope.editTransformProperty = function(transform) {
      if (transform.placeHolderTransform){
        return;
      }
      $bootstrapModal.open({
        templateUrl: '/assets/features/etlapps/templates/create/transformProperty.html',
        controller: ['$scope', function($scope) {
          $scope.transform = transform;
        }],
        size: 'lg',
        backdrop: true,
        keyboard: true
      });
    }

    $scope.editTransformProperties = function() {
      if ($scope.transforms.length === 0) {
        return;
      }
      $bootstrapModal.open({
        templateUrl: '/assets/features/etlapps/templates/create/transformProperties.html',
        scope: $scope,
        size: 'lg',
        backdrop: true,
        keyboard: true

      });
    };

    $scope.doSave = function() {
      var transforms = [],
          i;

      if ($scope.source.placeHolderSource || $scope.sink.placeHolderSource) {
        return;
      }
      for(i=0; i<$scope.transforms.length; i+=1) {
        if (!$scope.transforms[i].placeHolderTransform) {
          transforms.push($scope.transforms[i]);
        }
      }
      var data = {
        template: $scope.metadata.type,
        config: {
          source: $scope.source,
          sink: $scope.sink,
          transforms: transforms
        }
      };
      apiFactory.save(data);
    }

    $scope.dragdrop = {
      dragStart: function (drag) {
        console.log('dragStart', drag.source, drag.dest);
      },
      dragEnd: function (drag) {
        console.log('dragEnd', drag.source, drag.dest);
      }
    };
  });
