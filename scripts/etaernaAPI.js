/**
 * A single ToDo in our list of Todos.
 * @typedef {Object} Actor
 * @property {string} id - A unique ID to identify this actor.
 * @property {string} name - The name of the character.
 * @property {boolean} isActive - Marks whether the actor should be synched.
 * @property {string} img - The image path.
 */


class EtaernaApi{
	static ID = 'etaernaAPI';
	static logging = true;

	static TEMPLATES = {
		ETAERNAAPI_MANAGE: `modules/${this.ID}/templates/etaernaapi-manage-actors.hbs`,
		ETAERNAAPI_ADD: `modules/${this.ID}/templates/etaernaapi-add-actor.hbs`
	  }

	static initialize(){
		EtaernaApiSettings.registerSettings();
		EtaernaApi.registerHooks();
	}

	static log(...args) {
		if(this.logging){
			console.log(this.ID, '|', ...args);
		}
	  }

	static registerHooks(){
		//Update actor
		Hooks.on("updateActor", (Actor, patch, diff) => {		
			let actorIDs = EtaernaApiSettings.getAllActiveActorIDs();
			EtaernaApi.log("updateActor");
			if(actorIDs.includes(Actor._id)){
				if(patch.hasOwnProperty("system")){
					this.patchActor(Actor, patch.system.props);
				} else{
					let k = Object.keys(patch)[0];
					let v = Object.values(patch)[0];
					this.patchActor(Actor, {[k]:v});
				}
			}	
		});
	}

	static extractData(Actor){
		var data;
		data = Actor.system.props;
		data.foundryID = Actor._id;
		data.name = Actor.name;
		data.img = Actor.img;
		return data;
	}

	static getFaehigkeit(Actor, index){
		console.log(Actor);
		let faehigkeit = {};
		let props = Actor.system.props;
		faehigkeit["Faehigkeitenfield"+index] = props["Faehigkeitenfield"+index]; 
		faehigkeit["Attributname"+index] = props["Attributname"+index]; 
		faehigkeit["Faehigkeitenfieldvalue"+index] = props["Faehigkeitenfieldvalue"+index]; 
		return faehigkeit;
	}


	static pushActor(Actor){
		let endpoint = `${EtaernaApiSettings.getEndpoint()}/char/forge/${Actor._id}`;	
		const xhttp = new XMLHttpRequest();
		EtaernaApi.log(EtaernaApi.extractData(Actor));

		xhttp.onload = function() {
			EtaernaApi.log(this.responseText);
			if(xhttp.status == 404){

			}
		}

		xhttp.open("PUT", endpoint, true);
		xhttp.setRequestHeader("Content-Type", "application/json");
		xhttp.send(JSON.stringify(EtaernaApi.extractData(Actor)));
	}

	static patchActor(Actor, patch){
		let endpoint = `${EtaernaApiSettings.getEndpoint()}/char/forge/${Actor._id}`;	
		const xhttp = new XMLHttpRequest();
		EtaernaApi.log(patch);
		xhttp.onload = function() {
			EtaernaApi.log(this.responseText);
			if(xhttp.status == 404){
				EtaernaApi.log(EtaernaApi.extractData(Actor));
				xhttp.open("PUT", endpoint, true);
				xhttp.setRequestHeader("Content-Type", "application/json");
				xhttp.send(JSON.stringify(EtaernaApi.extractData(Actor)));
			}
		}

		let key = Object.keys(patch)[0];
		
		const faehigkeit = new RegExp("Faehigkeitenfield(\\d+)");
		let match = faehigkeit.exec(key);
		if(match){
			patch = EtaernaApi.getFaehigkeit(Actor, match[1]);
		}

		xhttp.open("PATCH", endpoint, true);
		xhttp.setRequestHeader("Content-Type", "application/json");
		xhttp.send(JSON.stringify(patch));
	}

	static createActor(Actor){
		const xhttp = new XMLHttpRequest();
		xhttp.onload = function() {
			EtaernaApi.log(this.responseText);
		}
		xhttp.open("POST", `${EtaernaApiSettings.getEndpoint()}/char/forge/`, true);
		xhttp.setRequestHeader("Content-Type", "application/json");
		xhttp.send(JSON.stringify(this.extractData(Actor)));
		EtaernaApi.log(EtaernaApi.extractData(Actor));
	}

	static deleteActor(ID){
		const xhttp = new XMLHttpRequest();
		xhttp.onload = function() {
			EtaernaApi.log(this.responseText);
		}
		xhttp.open("DELETE", `${EtaernaApiSettings.getEndpoint()}/char/forge/${ID}`, true);
		xhttp.setRequestHeader("Content-Type", "application/json");
		xhttp.send();
	}

	static pushAllActors(){
		for(const id of EtaernaApiSettings.getAllActiveActorIDs()){
			EtaernaApi.pushActor(game.actors.get(id));
		}
	}
}

class EtaernaApiSettings{

	static registerSettings(){
		//ApiKey
		game.settings.register(EtaernaApi.ID, 'ApiKey', {
			name: 'API KEY',
			scope: 'world',     // "world" = sync to db, "client" = local storage
			config: true,      // we will use the menu above to edit this setting
			type: String,
			default: "",        // can be used to set up the default structure
			onChange: value => { // value is the new value of the setting
				EtaernaApi.log(value)
			  },
		  });

		//Endpoint
		game.settings.register(EtaernaApi.ID, 'Endpoint', {
		name: 'API URL',
		scope: 'world',     // "world" = sync to db, "client" = local storage
		config: true,      // we will use the menu above to edit this setting
		type: String,
		default: "https://etaernaapi.kleingulo.de/",        // can be used to set up the default structure
		onChange: value => { // value is the new value of the setting
			EtaernaApi.log(value)
		  },
		});
		
		//Actors
		game.settings.register(EtaernaApi.ID, 'Actors', {
			scope: 'world',     // "world" = sync to db, "client" = local storage
			config: false,      // we will use the menu above to edit this setting
			type: Array,
			default: [],        // can be used to set up the default structure
			onChange: value => { // value is the new value of the setting
				EtaernaApi.log(value)
			  },
		});

		game.settings.registerMenu("etaernaAPI", "ActorMenu", {
			name: "Manage Actors",
			label: "Actors",      // The text label used in the button
			hint: "Add actors and let them synch with the API.",
			icon: "fas fa-bars",               // A Font Awesome icon used in the submenu button
			type: EtaernaApiManage,   // A FormApplication subclass
			restricted: true                   // Restrict this submenu to gamemaster only?
		});
		
	};

	static getApiKey() {
		return game.settings.get(EtaernaApi.ID, 'ApiKey');
	};

	static setApiKey(Key) {
		game.settings.set(EtaernaApi.ID,'ApiKey', Key);
	};

	static getEndpoint() {
		return game.settings.get(EtaernaApi.ID, 'Endpoint');
	};
	static setEndpoint(Endpoint) {
		game.settings.set(EtaernaApi.ID,'Endpoint', Endpoint);
	};

	static getAllActors() {
		return game.settings.get(EtaernaApi.ID, 'Actors');
	};

	static getAllActorIDs() {
		const ids = this.getAllActors().map(function (actor) {
			return actor.id;
		});
		return ids;
	};

	static getAllActiveActorIDs() {
		const ids = this.getAllActors().filter((actor) => actor.isActive).map(function (actor) {
			return actor.id;
		});
		return ids;
	};

	static addActorByID(ID) {
		let actor = game.actors.get(ID);
		return this.addActor(actor)

	};

	static addActor(Actor) {
		let actorsIds = this.getAllActorIDs();
		if(actorsIds.includes(Actor._id)){
			return -1;
		}
		let actors = this.getAllActors();
		actors.push(this.extractActorData(Actor));
		game.settings.set(EtaernaApi.ID, 'Actors', actors);
		return 0;
	};

	static updateActors(expandedData){
		let actors = this.getAllActors();
		for (const [key, value] of Object.entries(expandedData)) {
			let actor = actors.find(o => o.id === key);
			let data = value;
			for (const [key, value] of Object.entries(data)) {
				actor[key] = value;
			}
		}
		game.settings.set(EtaernaApi.ID, 'Actors', actors);
	}

	static removeActor(index){
		let actors = this.getAllActors();
		actors.splice(index, 1);
		game.settings.set(EtaernaApi.ID, 'Actors', actors);
	}

	static removeActorByID(id){
		EtaernaApi.log(id);
		let actors = this.getAllActors();
		let index = actors.findIndex(o => o.id === id);
		if(index != -1){
			actors.splice(index, 1);
			game.settings.set(EtaernaApi.ID, 'Actors', actors);
		}
	}

	static wipeActors(){
		game.settings.set(EtaernaApi.ID, 'Actors', []);
	}

	static extractActorData(actor){
		const newActor = {
			id: actor._id,
			name: actor.name,
			isActive: true,
			img: actor.img,
		  }
		return newActor;
	}
}


// Hooks
Hooks.on('init', EtaernaApi.initialize);

Hooks.on('ready', EtaernaApi.pushAllActors);



class EtaernaApiManage extends FormApplication {

	static get defaultOptions() {
		const defaults = super.defaultOptions;
		
		const overrides = {
			height: 'auto',
			id: EtaernaApi.ID+"_manage",
			template: EtaernaApi.TEMPLATES.ETAERNAAPI_MANAGE,
			title: 'EtaernaAPI',
			closeOnSubmit: false,
		};
		
		const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
		
		return mergedOptions;
	}

	async _updateObject(event, formData) {
		const expandedData = foundry.utils.expandObject(formData);
	
		await EtaernaApiSettings.updateActors(expandedData);
	
		this.render();
	}

	async _handleButtonClick(event) {
		const clickedElement = $(event.currentTarget);
		const action = clickedElement.data().action;
		switch(action) {

			case 'delete': {
				const actorID = clickedElement.parents('[data-actor-id]')?.data().actorId;
				await EtaernaApiSettings.removeActorByID(actorID);
				EtaernaApi.deleteActor(actorID);
				this.render();
				break;
			}

			case 'create': {
				this.submenu = new EtaernaApiAdd(this);
				this.submenu._render(true);
				break;
			}
	  
			default:
			  ToDoList.log(false, 'Invalid action detected', action);
		  }
	}
	
	getData() {
		return EtaernaApiSettings.getAllActors();
	}

	activateListeners(html) {
		super.activateListeners(html);
		html.on('click', "[data-action]", this._handleButtonClick.bind(this));
	}

}

class EtaernaApiAdd extends FormApplication {
	constructor(Parent){
		super();
		this.parent = Parent;
	}
	static get defaultOptions() {
		const defaults = super.defaultOptions;
		
		const overrides = {
			height: 'auto',
			id: EtaernaApi.ID+"_add",
			template: EtaernaApi.TEMPLATES.ETAERNAAPI_ADD,
			title: 'EtaernaAPI add',
			closeOnSubmit: true,
			baseApplication: EtaernaApi.ID+"_manage",
		};
		const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
		return mergedOptions;
	}

	async _updateObject(event, formData) {
		const expandedData = foundry.utils.expandObject(formData);
		let actor = game.actors.get(expandedData.ID);
		if (actor){
			if(EtaernaApiSettings.addActor(actor) != -1){
				EtaernaApi.createActor(actor);
			}
		}
		this.parent.render();
	}
}