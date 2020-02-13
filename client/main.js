import {
  Template
} from 'meteor/templating';
import {
  ReactiveVar
} from 'meteor/reactive-var';

// import { apiKey } from './imports/api_key';
// var api_key = apiKey();
// console.log(api_key);
// console.log(apiveyvar);
// const apikey= require './imports/api_key'
// var api_key = apikey.apiKey();
// console.log(api_key);
//no chnahge here
import './main.html';
// var saveNode = false;
Template.body.helpers({
  goalsSorted() {
    return Nodes.find({
      state: "active",
      type: "goal"
    }, {
      sort: {
        level: -1
      }
    })
  },
  policiesSorted() {
    return Nodes.find({
      state: "active",
      type: "policy"
    }, {
      sort: {
        level: -1
      }
    })
  },
  goals() {
    return Nodes.find({
      state: "active",
      type: "goal"
    })
  },
  goalSelected() {
    return this._id == Session.get("goalSelected") ? "selected" : ""
  },
  selectedGoal() {
    return Nodes.findOne(Session.get("goalSelected"))
  },
  policies() {
    return Nodes.find({
      state: "active",
      type: "policy"
    })
  },
  policySelected() {
    return this._id == Session.get("policySelected") ? "selected" : ""
  },
  selectedPolicy() {
    return Nodes.findOne(Session.get("policySelected"))
  },
  players() {
    return Nodes.find({
      state: "active",
      type: "player"
    })
  },
  simulationRunning() {
    var state = SimulationState.findOne()
    if (state) {
      return state.running
    } else {
      return false
    }
  },
  simulationSpeed() {
    var state = SimulationState.findOne()
    if (state) {
      return state.speed
    } else {
      return false
    }
  },
  adminView() {
    return Session.get("adminView")
  },
  snapshots() {
    return Snapshots.find({})
  },
  optionSelected() {
    return this.name == Session.get("snapshotSelected") ? "selected" : ""
  },
  snapshotSelected() {
    return Session.get("snapshotSelected")
  }

})

Template.body.events({
  "click .simulation-toggle"(event) {
    Meteor.call("simulation.toggle")
  },
  "click .simulation-step"(event) {
    Meteor.call("simulation.step")
  },
  "input .simulation-speed"(event) {
    var state = SimulationState.findOne()
    if (state) {
      SimulationState.update(state._id, {
        $set: {
          speed: Number(event.target.value)
        }
      })
    }
  },
  "change .load-goal"(event, template) {
    if (event.target.value != "load") {
      Session.set("goalSelected", event.target.value)
    }
  },
  "change .load-policy"(event, template) {
    if (event.target.value != "load") {
      Session.set("policySelected", event.target.value)
    }
  },
  "click .create-goal"(event) {
    var id = Meteor.call("nodes.create", "goal", function(error, result) {
      Session.set("goalSelected", result)
      updatePolicyGraph()
    })
  },
  "click .create-policy"(event) {
    var id = Meteor.call("nodes.create", "policy", function(error, result) {
      Session.set("policySelected", result)
      updatePolicyGraph
    })
  },
  "click .create-player"(event) {
    Meteor.call("nodes.create", "player", updatePolicyGraph)
  },
  "click .toggle-admin-view"(event) {
    if (Session.get("adminView")) {
      Session.set("adminView", false)
    } else {
      Session.set("adminView", true)
    }
  },
  "click .refresh-graph"(event) {
    updatePolicyGraph()
  },
  "click .take-snapshot"(event) {
    var name = prompt("name you snapshot")
    if (name) {
      Meteor.call("snapshots.create", name, function() {
        Session.set("snapshotSelected", name)
      })
    }
  },
  "change .load-snapshot"(event, template) {
    if (event.target.value != "load") {
      if (confirm("caution: when reverting to a snapshot you lose the current simulation state. proceed?")) {
        Meteor.call("snapshots.load", event.target.value, function() {
          updatePolicyGraph()
          Session.set("snapshotSelected", event.target.value == "empty" ? null : event.target.value)
        })
      }
    }
  },
  "click .delete-snapshot"(event) {
    if (confirm("delete snapshot " + Session.get("snapshotSelected") + "?")) {
      Meteor.call("snapshots.delete", Session.get("snapshotSelected"), function() {
        Session.set("snapshotSelected", null)
      })
    }
  },
  "click .export-json"(event) {
    $("#jsonOutput").html("<h2>JSON</h2><p>" + exportJson() + "</p>")
  },
  "click .json-import"(event) {
    if (confirm("import json data and replace current graph?")) {
      if (importJson($(".json-import-data").val())) {
        alert("sucess")
      } else {
        alert("import error")
      }
    }
  }
  // ,
  // "click .authenticte"(event){
  //   let apikeydata=
  //   if(LocalData.find().count() === 0){
  //     LocalData.insert({
  //       apiKey: apikeydata;
  //     })
  //   }
  //
  // }
})

Template.body.rendered = function() {
  Meteor.setTimeout(function() {
    updatePolicyGraph()
  }, 2000)
}

Template.policyShort.helpers({
  effective() {
    return this.level >= this.threshold
  },
  overflow() {
    return (this.level >= this.overflow) && (this.overflow > 0)
  }
})

Template.node.helpers({
  goal() {
    return this.type == "goal"
  },
  policy() {
    return this.type == "policy"
  },
  player() {
    return this.type == "player"
  },
  replenish() {
    return -this.decay
  },
  connections() {
    return NodeConnections.find({
      source: this._id
    })
  },
  showConnections() {
    return NodeConnections.find({
      source: this._id
    }).count() > 0
  },
  adminView() {
    return Session.get("adminView")
  }

})

Template.node.events({
  "change input"(event) {

    if (event.target.name == "replenish") {
      this["decay"] = -Number(event.target.value) // call negative decay "replenish" for player nodes
    } else {
      if ($(event.target).hasClass("number")) {
        this[event.target.name] = Number(event.target.value) // convert input to number
      } else {
        this[event.target.name] = event.target.value
      }
    }
    Nodes.update(this._id, this)


  },
  "click .delete-node"(event) {
    if (confirm("permanently delete node?")) {
      Meteor.call("nodes.delete", this._id, updatePolicyGraph)
    }
  },
  "click .save-node"(event) {
    //
    // console.log("_id = "+ this._id);
    console.log(event);



  }
})

Template.connection.helpers({
  targetTitle() {
    var node = Nodes.findOne(this.target)
    if (node) {
      let target = Nodes.findOne(this.target)
      return (target.description ? target.description : target.title.substr(0, 20))
    }
  },
  addPossible() {
    var maxBandwidth = 100
    var totalBandwidth = 0
    NodeConnections.find({
      source: this.source
    }).fetch().forEach(function(connection) {
      totalBandwidth += connection.bandwidth
    })
    return totalBandwidth < maxBandwidth
  },
  subPossible() {
    return this.bandwidth > 0
  },

})

Template.connection.events({
  "change input"(event) {
    var newValue = Number(event.target.value)
    var oldValue = this[event.target.name]
    this[event.target.name] = newValue
    NodeConnections.update(this._id, this)
    if (event.target.name == "bandwidth") {
      if (oldValue == 0 || newValue == 0) {
        updatePolicyGraph()
      }
    }
  },
  "click .plus-water"(event, template) {
    this.bandwidth += 1
    NodeConnections.update(this._id, this)
    if (this.bandwidth == 1) {
      updatePolicyGraph()
    }
  },
  "click .minus-water"(event, template) {
    if (this.bandwidth >= 1) {
      this.bandwidth -= 1
      NodeConnections.update(this._id, this)
      if (this.bandwidth == 0) {
        updatePolicyGraph()
      }
    }
  }


})
//
// post json to the game server -


Template.authorize.helpers({


});

Template.authorize.events({
  'submit .auth-form': function(event, template) {
    event.preventDefault();
    var setApiKey = event.target.apikey.value;
    console.log(setApiKey);

    if (LocalData.find().count() === 0) {
      LocalData.insert({
        apiKey: setApiKey
      })
      //console.log(ap);
    } else {
      LocalData.update({
        apiKey: setApiKey
      })

    }
    //   // LocalData.update({
    //   //   apiKey:setApiKey
    //   // })
    //   // console.log(LocalData.findOne());
    // )

  },
  'submit .exportToGame': function(event, template){
    event.preventDefault();
  exportNewNetwork();
  }
})

function exportNewNetwork() {
  var networkData = exportJson();

 var apiSlot = LocalData.findOne();// a hacky way of storing and retrieving the api key
 var apiId=apiSlot._id;
 var foo = LocalData.findOne({_id: apiId});
 var apiKey = foo.apiKey;
 console.log("and the key",apiKey);
 // console.log();
 setHeader = function(xhr) {
   xhr.setRequestHeader("X-API-KEY", apiKey);
 }
 //setHeader = function(xhr) { xhr.setRequestHeader("X-API-KEY", "ea2b40c5-77ef-11e8-b325-0c4de9cfe672"); }

 $.ajax({
   // url: 'https://free-ice-cream.appspot.com/v1/players/?player=',
   url: 'https://hivemind2.fic.li/v1/network/',
   //url: apiURL+'players/?player=',
   type: 'POST',
    contentType: 'application/json',
   // data: JSON.stringify(networkData),
    // data: networkData,
   data: networkData,
   success: function(data) {
     console.log(data);

     console.log("yay now lets set the table");
     setNewTable();
   },

   error: function(error) {
     console.log(error);
   },
   beforeSend: setHeader
 });

}

function setNewTable() {
  //var networkData = exportJson();

 var apiSlot = LocalData.findOne();// a hacky way of storing and retrieving the api key
 var apiId=apiSlot._id;
 var foo = LocalData.findOne({_id: apiId});
 var apiKey = foo.apiKey;
 console.log("and the key",apiKey);
 // console.log();
 setHeader = function(xhr) {
   xhr.setRequestHeader("X-API-KEY", apiKey);
 }
 //setHeader = function(xhr) { xhr.setRequestHeader("X-API-KEY", "ea2b40c5-77ef-11e8-b325-0c4de9cfe672"); }

 $.ajax({
   // url: 'https://free-ice-cream.appspot.com/v1/players/?player=',
   url: 'https://hivemind2.fic.li/v1/tables/',
   //url: apiURL+'players/?player=',
   type: 'POST',
    contentType: 'application/json',
   // data: JSON.stringify(networkData),
    // data: networkData,
   data: JSON.stringify({"name":"Nodemap"}),
   success: function(data) {
     console.log(data);
     console.log("cool so thats the table too");
     // console.log("player  token= " + data.token);

   },

   error: function(error) {
     console.log(error);
   },
   beforeSend: setHeader
 });

}
