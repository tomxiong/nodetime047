
var os = require('os');
var uvmon = require('nodefly-uvmon');


var nt;
var v8tools;
var active = false;
var origPaused;

exports.init = function(_nt) {
  nt = _nt;

  try { 
    v8tools = require('v8tools'); 
  } 
  catch(err) { 
    nt.error(err);
  }

  // if paused during CPU profiling, do not resume automatically
  nt.on('pause', function() {
    origPaused = true;
  });
}


/* CPU profiler */

exports.startCpuProfiler = function(seconds) {
  if(!v8tools || active) return;
  active = true;

  seconds || (seconds = 10);

  var paused = nt.paused;
  if(!paused) {
    nt.pause(true);
    origPaused = paused;
  }


  v8tools.startV8Profiler();
  nt.message("V8 CPU profiler started");

  // stop v8 profiler automatically after 10 seconds
  setTimeout(function() {
    try {
      exports.stopCpuProfiler();
    }
    catch(err) {
      nt.error(err);
    }
  }, seconds * 1000);
};


exports.stopCpuProfiler = function() {
  if(!v8tools || !active) return;

  var nodes = {};
  var root = undefined;
  var rootSamplesCount = undefined;

  v8tools.stopV8Profiler(function(parentCallUid, callUid, totalSamplesCount, functionName, scriptResourceName, lineNumber) {
    if(rootSamplesCount === undefined)
      rootSamplesCount = totalSamplesCount;

    var cpuUsage = ((totalSamplesCount * 100) / rootSamplesCount || 1);
    var obj = {
      _totalSamplesCount: totalSamplesCount,
      _functionName: functionName,
      _scriptResourceName: scriptResourceName,
      _lineNumber: lineNumber,
      _cpuUsage: cpuUsage, 
      _id: nt.nextId++,
      _target: [],
      _label: cpuUsage.toFixed(2) + "% - " + functionName
    };

    if(scriptResourceName && lineNumber) 
      obj._label += " (" + scriptResourceName + ":" + lineNumber + ")";

    nodes[callUid] = obj;
    if(root === undefined) {
      root = obj;
    }

    if(parentCallUid) {
      var parentNode = nodes[parentCallUid];
      if(parentNode) parentNode._target.push(obj);
    }
  });

  nt.message("V8 CPU profiler stopped");

  if(root) {
    var profile = {};
    profile._id = nt.nextId++;
    profile._label = os.hostname() + ' [' + process.pid + ']';
    profile._ts = nt.millis();
    profile._ns = 'cpu-profiles';
    profile.root = root;

    nt.agent.send({cmd: 'updateData', args: profile});
  }


  if(!origPaused) {
    nt.resume();
  }

  active = false;
};



/* Heap profiler */

function edgeTypeToString(type) {
  switch(type) {
    case 0: 
      return 'variable';
    case 1: 
      return 'element';
    case 2: 
      return 'property';
    case 3: 
      return 'internal';
    case 4: 
      return 'hidden';
    case 5: 
      return 'shortcut';
    case 6:
      return 'weak';
    default:
      return 'other';
  }
}

function nodeTypeToString(type) {
  switch(type) {
    case 0: 
      return 'hidden';
    case 1: 
      return 'array';
    case 2: 
      return 'string';
    case 3: 
      return 'object';
    case 4: 
      return 'compiled code';
    case 5: 
      return 'function clojure';
    case 6: 
      return 'regexp';
    case 7: 
      return 'heap number';
    case 8: 
      return 'native object';
    default:
      return 'other';
  }
}



function calculateRetainedSize(depth, walked, node) {
  if(depth++ > 1000) return 0;
  walked[node.nodeUid] = true;

  node.retainedSize += node.selfSize;

  node.children.forEach(function(childNode) {
    if(walked[childNode.nodeUid] || childNode.retainersCount > 1) return;

    if(!childNode.retainedSize) {
      calculateRetainedSize(depth + 1, walked, childNode);
    }

    node.retainedSize += childNode.retainedSize;
  });
}


function genKey(node) {
  if(node.retainerType == 0 || node.retainerType == 2) {
    return edgeTypeToString(node.retainerType) + ':' + node.retainerName;
  }
  else {
    return edgeTypeToString(node.retainerType);
  }
}


function genGroupLabel(node) {
  switch(node.retainerType) {
    case 0: 
      return 'Variable: ' + node.retainerName;
    case 1: 
      return 'Array elements';
    case 2: 
      return 'Property: ' + node.retainerName;
    case 4: 
      return 'Hidden links';
    case 6:
      return 'Weak references';
    default:
      return 'Other';
  }
}

function genGroupType(node) {
  switch(node.type) {
    case 1: 
      return 'Array';
    case 2: 
      return 'String';
    case 3: 
      return node.name;
    case 4: 
      return 'compiled code';
    case 5: 
      return 'Function';
    case 6: 
      return 'RegExp';
    case 7: 
      return 'Number';
    case 8: 
      return node.name;
    default:
      return 'other';
  }
}

function truncate(obj) {
  if(!obj) return undefined;
  
  if(typeof(obj) === 'string') {
    if(obj.length > 25) {
      return obj.substring(0, 25) + '...';
    }
    else {
      return obj;
    }
  }
  else if(typeof(obj) === 'number') {
    return obj;
  }
}


function genNodeLabel(node) {
  var name = truncate(node.name);
  return nodeTypeToString(node.type) + (name ? (": " + name) : "");
}


exports.takeHeapSnapshot = function() {
  if(!v8tools || active) return;
  active = true;

  nt.message("V8 heap profiler starting...");

  var seen = {};
  var groups = {};
  var groupsByType = {};
  var totalSize = 0;
  var totalCount = 0;

  var nodes = {};
  
  v8tools.takeHeapSnapshot(function(parentNodeUid, nodeUid, name, type, selfSize, retainerName, retainerType) {
    if(retainerType === 5) return;

    var node = nodes[nodeUid];
    if(!node) {
      node = nodes[nodeUid] = {
        nodeUid: nodeUid,
        name: name,
        type: type,
        selfSize: selfSize,
        retainerName: retainerName,
        retainerType: retainerType
      }
    }
  });
 
  for (var prop in nodes) {
    var node = nodes[prop];   
  
      var key = genKey(node);
      var obj = groups[key];
      if(!obj) {
        obj = groups[key] = {
          _id: nt.nextId++,
          _label: genGroupLabel(node),
          size: 0, 
          count: 0,
          largestInstances: [],
          minSize: 0
        };
      }

      obj.size += node.selfSize;
      obj.count++;
      
      var large = (node.selfSize > obj.minSize || obj.largestInstances.length < 10);

      var instance = {
        _id: nt.nextId++,
        _label: genNodeLabel(node),
        _selfSize: node.selfSize,
        'Name': node.name,
        'Type': nodeTypeToString(node.type),
        'Size (KB)': (node.selfSize / 1024).toFixed(3)
      };


      if(large) {
        obj.largestInstances.push(instance);

        obj.largestInstances = obj.largestInstances.sort(function(a, b) {
          return b._selfSize - a._selfSize;
        });

        obj.largestInstances.splice(10);
        obj.minSize = obj.largestInstances[obj.largestInstances.length - 1]._selfSize;
      }
      
      var keyByType = genGroupType(node);
      objByType = groupsByType[keyByType];
      if(!objByType) {
        objByType = groupsByType[keyByType] = {
          _id: nt.nextId++,
          _label: genGroupLabel(node),
          size: 0, 
          count: 0,
          largestInstances: [],
          minSize: 0
        };
      }

      objByType.size += node.selfSize;
      objByType.count++;

      var largeByType = (node.selfSize > objByType.minSize || objByType.largestInstances.length < 10);

      var instanceByType = {
        _id: nt.nextId++,
        _label: genNodeLabel(node),
        _selfSize: node.selfSize,
        'Name': node.name,
        'Type': nodeTypeToString(node.type),
        'Size (KB)': (node.selfSize / 1024).toFixed(3)
      };

      if(largeByType) {
        objByType.largestInstances.push(instance);

        objByType.largestInstances = objByType.largestInstances.sort(function(a, b) {
          return b._selfSize - a._selfSize;
        });

        objByType.largestInstances.splice(10);
        objByType.minSize = objByType.largestInstances[objByType.largestInstances.length - 1]._selfSize;
      }
      

    totalSize += node.selfSize;
    totalCount++; 
  }

  // sort groups
  var groupsOrdered = [];
  for(var key in groups) {
    groupsOrdered.push(groups[key]);
  }
  groupsOrdered = groupsOrdered.sort(function(a, b) {
    return b.size - a.size;
  });
  groupsOrdered = groupsOrdered.slice(0, 100);


  // prepare for rendering
  for(var key in groups) {
    var obj = groups[key];

    obj['Size (KB)'] = (obj.size / 1024).toFixed(3);
    if(totalSize > 0) obj['Size (%)'] = Math.round((obj.size / totalSize) * 100);
    //obj._label = obj['Size (%)'] + "% - " + obj._label;    

    obj['Count'] = obj.count;
    if(totalCount > 0) obj['Count (%)'] = Math.round((obj.count / totalCount) * 100);

    obj['Largest Instances'] = obj.largestInstances;
    
    delete obj.size;
    delete obj.count;    
    delete obj.largestInstances;
    delete obj.minSize;    
  }

  var groupsByTypeOrdered = [];
  for(var key in groupsByType) {
    groupsByTypeOrdered.push(groupsByType[key]);
  }
  groupsByTypeOrdered = groupsByTypeOrdered.sort(function(a, b) {
    return b.size - a.size;
  });
  groupsByTypeOrdered = groupsByTypeOrdered.slice(0, 100);

  // prepare for rendering
  for(var key in groupsByType) {
    var obj = groupsByType[key];

    obj['Size (KB)'] = (obj.size / 1024).toFixed(3);
    if(totalSize > 0) obj['Size (%)'] = Math.round((obj.size / totalSize) * 100);
    //obj._label = obj['Size (%)'] + "% - " + obj._label;    

    obj['Count'] = obj.count;
    if(totalCount > 0) obj['Count (%)'] = Math.round((obj.count / totalCount) * 100);

    obj['Largest Instances'] = obj.largestInstances;
    
    delete obj.size;
    delete obj.count;    
    delete obj.largestInstances;
    delete obj.minSize;
    
  }
  

  nt.message("V8 heap profiler stopped");

  var snapshot = {};
  snapshot._id = nt.nextId++;
  snapshot._label = os.hostname() + ' [' + process.pid + ']';
  snapshot._ts = nt.millis();
  snapshot._ns = 'heap-snapshots';
  snapshot['Retainers'] = groupsOrdered;
  snapshot['Objects'] = groupsByTypeOrdered;

  nt.agent.send({cmd: 'updateData', args: snapshot});

  active = false;

  //console.log(require('util').inspect(groupsOrdered, true, 20, true));
};


exports.afterGC = function() {

  if(!v8tools) return;

  var lastUsedHeapSize = undefined;

  v8tools.afterGC(function(gcType, gcFlags, usedHeapSize) {
    //console.log('Garbege collect type :' + gcType);
    if(gcType === 'kGCTypeMarkSweepCompact') {
      nt.metric('Process', 'NumberOfFullGC', 1, 'count', 'sum');
      //console.log('Garbege Full collect  :' + mInfo.numFullGC);     
    }
    else if(gcType === 'kGCTypeScavenge') {
      nt.metric('Process', 'NumberOfIncGC', 1, 'count', 'sum');
      //console.log('Garbege Inc collect  :' + mInfo.numIncGC);        
    }
    if(lastUsedHeapSize !== undefined) {
      var sizeChange = (usedHeapSize - lastUsedHeapSize) / 1024
      //console.log('Garbege GCAfter heap size change :' + sizeChange);
      nt.metric('Process', 'SizeChange', sizeChange, 'kb', 'sum');    
      //sizeChange.addValue((usedHeapSize - lastUsedHeapSize) / 1048576);
    }
    lastUsedHeapSize = usedHeapSize;    
  });
};

exports.getUVData = function() {
  if (!uvmon) return;
  return uvmon.getData();
};

