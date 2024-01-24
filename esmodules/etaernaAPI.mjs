//Import
import {JWT} from './jwt.js'

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
	static logging = false;

	static jwt = null;

	static TEMPLATES = {
		ETAERNAAPI_MANAGE: `modules/${this.ID}/templates/etaernaapi-manage-actors.hbs`,
		ETAERNAAPI_ADD: `modules/${this.ID}/templates/etaernaapi-add-actor.hbs`
	  }

	static initialize(){
		EtaernaApiSettings.registerSettings();
		EtaernaApi.registerHooks();
		EtaernaApi.createJWT()
	}

	static log(...args) {
		if(this.logging){
			console.log(this.ID, '|', this.name, ...args);
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
		let faehigkeit = {};
		let props = Actor.system.props;
		faehigkeit["slot"] = index;
		faehigkeit["name"] = props["Faehigkeitenfield"+index]; 
		faehigkeit["attribut"] = props["Attributname"+index]; 
		faehigkeit["wert"] = props["Faehigkeitenfieldvalue"+index]; 
		return {"faehigkeit":faehigkeit};
	}

	static getItem(Actor, index){
		let item = {};
		let props = Actor.system.props;
		item["slot"] = index;
		item["name"] = props["ItemTextfield"+index];
		item["anzahl"] = props["ItemItemTextfieldNumber"+index];
		return {"item":item};
	}

	static getZauber(Actor, index){
		let zauber = {};
		let props = Actor.system.props;
		zauber["slot"] = index;
		zauber["mp"] = props["MP"+index];
		zauber["effekt"] = props["Effekt"+index];
		zauber["wuerfel"] = props["Wuerfel"+index];
		zauber["element"] = props["Element"+index];
		if(index > 14) {
			zauber["name"] = props["Eskalation"+(index-14)]
		}
		else if (index > 10) {
			zauber["name"] = props["Beschwoerung"+(index-10)]
		}
		else {
			zauber["name"] = props["Zauber"+index]
		}
		return {"zauber":zauber};
	}

	static createJWT(){
		var jwt = new JWT();
		
		const header = {
			alg: 'HS256',
			typ: 'JWT',
		};

		var data = {
			"realm": EtaernaApiSettings.getRealm()
		};

		var enc = new TextEncoder();
		jwt.sign(enc.encode(JSON.stringify(header)), enc.encode(JSON.stringify(data)), EtaernaApiSettings.getApiKey()).then((ret) => {this.jwt = ret; EtaernaApi.log(this.jwt);});
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
		xhttp.setRequestHeader('Authorization', 'Bearer ' + this.jwt);
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
				xhttp.setRequestHeader('Authorization', 'Bearer ' + this.jwt);
				xhttp.send(JSON.stringify(EtaernaApi.extractData(Actor)));
			}
		}.bind(this);

		let key = Object.keys(patch)[0];
		let val = Object.values(patch)[0];
		
		const Faehigkeitenfield = new RegExp("Faehigkeitenfield(\\d+)");
		let match = Faehigkeitenfield.exec(key);
		if(match){
			if (val != '0')
			{
				patch = EtaernaApi.getFaehigkeit(Actor, match[1]);
			}
		}
		if(!match){
			const Attributname = new RegExp("Attributname(\\d+)");
			match = Attributname.exec(key);
			if(match){
				patch = EtaernaApi.getFaehigkeit(Actor, match[1]);
				if(patch["name"] == "")
				{
					return;
				}
			}
		}
		if(!match){
			const Faehigkeitenfieldvalue = new RegExp("Faehigkeitenfieldvalue(\\d+)");
			match = Faehigkeitenfieldvalue.exec(key);
			if(match){
				patch = EtaernaApi.getFaehigkeit(Actor, match[1]);
				if(patch["faehigkeit"]["name"] == "")
				{
					return;
				}
			}
		}
		if(!match){
			const ItemTextfield = new RegExp("ItemTextfield(\\d+)");
			match = ItemTextfield.exec(key);
			if(match){
				patch = EtaernaApi.getItem(Actor, match[1]);
			}
		}
		if(!match){
			const ItemItemTextfieldNumber = new RegExp("ItemItemTextfieldNumber(\\d+)");
			match = ItemItemTextfieldNumber.exec(key);
			if(match){
				patch = EtaernaApi.getItem(Actor, match[1]);
				if(patch["item"]["name"] == "")
				{
					return;
				}
			}
		}

		if(!match){
			const Zauber = new RegExp("Zauber(\\d+)");			
			match = Zauber.exec(key);
			if(match){
				patch = EtaernaApi.getZauber(Actor, match[1]);
			}
		}
		if(!match){
			const Beschwoerung = new RegExp("Beschwoerung(\\d+)");
			match = Beschwoerung.exec(key);
			if(match){
				patch = EtaernaApi.getZauber(Actor, parseInt(match[1])+10);
			}
		}
		if(!match){
			const Eskalation = new RegExp("Eskalation(\\d+)");
			match = Eskalation.exec(key);
			if(match){
				patch = EtaernaApi.getZauber(Actor, parseInt(match[1])+14);
			}
		}
		if(!match){
			const mp = new RegExp("MP(\\d+)");
			match = mp.exec(key);
			if(match){
				patch = EtaernaApi.getZauber(Actor, match[1]);
				if(patch["zauber"]["name"] == "")
				{
					return;
				}
			}
		}
		if(!match){
			const Effekt = new RegExp("Effekt(\\d+)");
			match = Effekt.exec(key);
			EtaernaApi.log("10");
			if(match){
				patch = EtaernaApi.getZauber(Actor, match[1]);
				if(patch["zauber"]["name"] == "")
				{
					return;
				}
			}
		}
		if(!match){
			const Wuerfel = new RegExp("Wuerfel(\\d+)");
			match = Wuerfel.exec(key);
			EtaernaApi.log("11");
			if(match){
				patch = EtaernaApi.getZauber(Actor, match[1]);
				if(patch["zauber"]["name"] == "")
				{
					return;
				}
			}
		}
		if(!match){
			const Element = new RegExp("Element(\\d+)");
			match = Element.exec(key);
			EtaernaApi.log("12");
			if(match){
				patch = EtaernaApi.getZauber(Actor, match[1]);
				if(patch["zauber"]["name"] == "")
				{
					return;
				}
			}
		}
		EtaernaApi.log(endpoint);
		EtaernaApi.log(patch);
		xhttp.open("PATCH", endpoint, true);
		xhttp.setRequestHeader("Content-Type", "application/json");
		xhttp.setRequestHeader('Authorization', 'Bearer ' + this.jwt);
		xhttp.send(JSON.stringify(patch));
	}

	static createActor(Actor){
		const xhttp = new XMLHttpRequest();
		xhttp.onload = function() {
			EtaernaApi.log(this.responseText);
		}
		xhttp.open("POST", `${EtaernaApiSettings.getEndpoint()}/char/forge/`, true);
		xhttp.setRequestHeader("Content-Type", "application/json");
		xhttp.setRequestHeader('Authorization', 'Bearer ' + this.jwt);
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
		xhttp.setRequestHeader('Authorization', 'Bearer ' + this.jwt);
		xhttp.send("1");
	}

	static pushAllActors(){
		for(const id of EtaernaApiSettings.getAllActiveActorIDs()){
			EtaernaApi.pushActor(game.actors.get(id));
		}
	}
}

class EtaernaApiSettings{

	static registerSettings(){
		//GameName
		game.settings.register(EtaernaApi.ID, 'Realm', {
			name: 'REALM',
			scope: 'world',     // "world" = sync to db, "client" = local storage
			config: true,      // we will use the menu above to edit this setting
			type: String,
			default: "",        // can be used to set up the default structure
			onChange: value => { // value is the new value of the setting
				EtaernaApi.createJWT()
				},
			});
		
		
		//ApiKey
		game.settings.register(EtaernaApi.ID, 'ApiKey', {
			name: 'API KEY',
			scope: 'world',     // "world" = sync to db, "client" = local storage
			config: true,      // we will use the menu above to edit this setting
			type: String,
			default: "",        // can be used to set up the default structure
			onChange: value => { // value is the new value of the setting
				EtaernaApi.createJWT()
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


	static getRealm() {
		return game.settings.get(EtaernaApi.ID, 'Realm');
	};

	static setRealm(Name) {
		game.settings.set(EtaernaApi.ID,'Realm', Name);
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
window.etaernaapi = { EtaernaApi: EtaernaApi }