Tasks = new Mongo.Collection("tasks");
Points = new Mongo.Collection("points");

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");
  Meteor.subscribe("points");

  // set basic session
  Session.set("setFeed", "all");

  //set current date
  Template.registerHelper('formatDate', function(date) {
    return moment().format('dddd MMMM Do');
  });

  Template.body.helpers({
    tasks: function () {
      if (Session.get("setFeed") == "accepted") {
        //show accepted tasks feed
        return Tasks.find({done:Meteor.user().username}).fetch();
      } else if (Session.get("setFeed") == "requests") {
        //show requested tasks feed
        return Tasks.find({username:Meteor.user().username}).fetch();
      } else if (Session.get("setFeed") == "public") {
        //show public feed
        return Tasks.find({}, {sort: {createdAt: -1}}).fetch();
      } else {
        //default is public feed
        return Tasks.find({}, {sort: {createdAt: -1}}).fetch();
      }
    }

  });

  Template.body.events({
    "submit .new-task": function (event) {
      // This function is called when the new task form is submitted
      var text = event.target.text.value;
      Meteor.call("addLil",Meteor.user().username);
      Meteor.call("addTask", text);

      // Clear form
      event.target.text.value = "";

      // Prevent default form submit
      return false;
    },
  });

  //click event handler for public feed
  Template.public_feed.events({
    "click #public": function () {
      Session.set("setFeed", "public");
    }
  });

  //click event handler for own requests feed
  Template.own_requests.events({
    "click #requests": function () {
      Session.set("setFeed", "requests");
    }
  })

  //click event handler for accepting tasks feed
  Template.accepted_tasks.events({
    "click #accepted": function () {
      console.log("click #accepted");
      Session.set("setFeed", "accepted");
    }
  })
  
  Template.task.events({
    //delete task
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
    },
    
    //accept task, set name of person who accepted
    "click .iaccept": function(e){
      Meteor.call("setName",this._id);
          Meteor.call("addLots",Meteor.user().username,this._id);
     Meteor.call("setComp",this._id);
  
    }
  });

  // helper for who the owner of the task is
  Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

Template.leaderboard.helpers({
   points: function(){
   Meteor.call("addPerson",Meteor.user().username);
   return Points.find({}, {sort: {"number": -1}}).fetch();
}
});

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

// ******************************************************* //

if (Meteor.isServer) {
  Meteor.publish("points", function(){
   return Points.find({});
  
  });
  // Only publish tasks that are public or belong to the current user
  Meteor.publish("tasks", function () {
    return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });

  Meteor.methods({

  addPerson: function (ppl){
 if (Points.find({person: Meteor.user().username}).count()==0){
    Points.insert({
     person:ppl,
     number:0
    });
  }
},
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username,
      done: "",
      once: false
    });
  },
  // delete a task
  deleteTask: function (taskId) {
    var task = Tasks.findOne(taskId);
    if (task.owner !== Meteor.userId()) {
      // make sure person who wrote the task is same as one who is deleting
      throw new Meteor.Error("not-authorized");
    }
    Tasks.remove(taskId);
  },

    // set the name of who's doing task, make sure not same perosn who posted
  setName: function(taskId){
      var task=Tasks.findOne(taskId);
     
      if(!task.once && task.owner !== Meteor.userId()){
       Tasks.update(taskId, { $set: { "done": Meteor.user().username} });
      }
    },

    // adding points to person doing task 
  addLots:function(ppl,taskId){
      var task=Tasks.findOne(taskId);
      if(!task.once && task.owner !== Meteor.userId()){
          Points.update({"person": ppl}, {$inc: {"number":5}});
     }
  } ,

  // only letting the task be accepted once 
  setComp: function(taskId){
        var task=Tasks.findOne(taskId);
        if (task.owner !== Meteor.userId()) {
            Tasks.update(taskId, {$set: {"once": true}});
        }
    },

  // add points for posting
   addLil:function(ppl){  
    Points.update({"person": ppl}, {$inc: {"number":5}});
  }
});
}

