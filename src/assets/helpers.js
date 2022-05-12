export function loadDDHIFonts() {
    if(document.querySelector('head') !== null) {
        var headElement = document.querySelector('head');
  
        if (headElement.querySelector("[title='DDHI Viewer Fonts']") === null) {
          var link = document.createElement('link');
          link.setAttribute('title','DDHI Viewer Fonts');
          link.setAttribute('rel','stylesheet');
          link.setAttribute('href','https://fonts.googleapis.com/css?family=Roboto|Aleo');
          headElement.appendChild(link);
        }
    }
}

export function fadeOut(fadeTarget,display='grid') {
    var fadeEffect = setInterval(function () {
      if (!fadeTarget.style.opacity) {
        fadeTarget.style.opacity = 1;
      }
      if (fadeTarget.style.opacity > 0) {
        fadeTarget.style.opacity -= 0.1;
      } else {
        clearInterval(fadeEffect);
        fadeTarget.style.display = 'none';
      }
    }, 200);
  }

export function fadeIn(fadeTarget,display='grid') {
    fadeTarget.style.opacity = 0;
    fadeTarget.style.display = display;

    var fadeEffect = setInterval(function () {
      if (!fadeTarget.style.opacity) {
        fadeTarget.style.opacity = 0;
      }
      if (fadeTarget.style.opacity < 1) {
        fadeTarget.style.opacity += 0.1;
      } else {
        clearInterval(fadeEffect);
      }
    }, 200);
  }

export async function getAPIResource(resource,prop,format='json') {

    const response = await fetch(this.apiURI + '/' + resource + '?_format=' + format, {mode: 'cors'});
    const result = await response.json();

    if (!response.ok) {
      const message = `An error has occured: ${response.status}`;
      throw new Error(message);
    }

    this[prop] = result;

    return response;

  }

  // @method getWikiData()
  // @description A general purpose utility for retrieving data from the Wikidata API.
  //   see https://www.wikidata.org/w/api.php?action=help&modules=wbgetentities
  // @param qids An array of qids to submit
  // @param props The properties to retrieve. Defaults to 'sitelinks/urls'.
  //
  // @return The result object
  // NOTE: The maximum number of qids that can be retrieved in one query is 50.

export async function getWikiData(qids=[],props=['sitelinks/urls','claims']) {

    if (qids.length > 50) {
      console.log('Maximum number of Wikidata ids exceeded.');
    }

    // Note &origin=* parameter required for MediaWiki/Wikidata requests

    const response = await fetch(this.wikidataAPIUrl + '&origin=*' + '&props=' + props.join('|') + '&ids=' + qids.join('|'), {mode: 'cors'});

    //const response = await fetch(this.wikidataAPIUrl + '&props=' + props.join('|') + '&ids=' + qids.join('|'));
    const result = await response.json();


    if (!response.ok) {
      const message = `An error has occured: ${response.status}`;
      throw new Error(message);
    }

    return result;

  }

  /**
   *  @function getEventData()
   *  @description Retrives event data for all event entities from WikiData.
   *    Date data populates this.eventDateIndex property.
   *    this.eventDateIndex is keyed by QID, each an object with five properties. Each can be null if empty:
   *      startDate: The claimed start date. (Wikidata Property P580)
   *      endDate: The claimed end date. (Wikidata Property P582)
   *      pointInTime: The date of event if not a range (Wikidate Property P585)
   *      sortDateStart: Merging of startDate and pointInTime for sorting.
   *      sortDateEnd:  Merging of endDate and pointInTime for sorting.
   */

export async function getEventData() {

    this.eventDateIndex = {};
// todo : fix for multi
    var response = await this.getAssociatedEntitiesByType(this,'multiInterview',this.getActiveIdFromAttribute());
    var qids = [];
    var id = this.getActiveIdFromAttribute();
    const ids = id.split(',')
    await Promise.all(ids.map(async (id) => {
      this.eventData = this.multiInterview[id].events
      for (var i=0;i<this.eventData.length;i++) {
        if (typeof this.eventData[i] !== "undefined" && this.eventData[i].qid)
          qids.push(this.eventData[i].qid);
      }
  
      if (qids.length > 0) {
        var wikiDataEvents = await this.getWikiData(qids);
  
  
  
        for (var qid in wikiDataEvents.entities) {
          var claims = wikiDataEvents.entities[qid].claims; // Information claims from Wikidata... in other words the metadata
  
          this.eventDateIndex[qid] = {
            startDate: claims.hasOwnProperty('P580') ? claims.P580[0].mainsnak.datavalue.value.time : null,
            endDate: claims.hasOwnProperty('P582') ? claims.P582[0].mainsnak.datavalue.value.time : null,
            pointInTime: claims.hasOwnProperty('P585') ? claims.P585[0].mainsnak.datavalue.value.time: null,
          }
  
          this.eventDateIndex[qid].sortDateStart = this.eventDateIndex[qid].startDate ? this.eventDateIndex[qid].startDate : this.eventDateIndex[qid].pointInTime;
          this.eventDateIndex[qid].sortDateEnd = this.eventDateIndex[qid].endDate ? this.eventDateIndex[qid].endDate : this.eventDateIndex[qid].pointInTime;
        }
      }
    }))
    
    return response;
  }


export async function getTranscripts() {
    return this.getAPIResource('collections/transcripts','availableIds');
}


  // @method getItemDataById()
  // @description Fetches the data for a particular item id (e.g. a transcript) and
  //   populates the "items" property. Active Ids are set elsewhere and are stored as
  //   attributes in the component's host element. Logic exists to support multiple
  //   active items if that becomes part of a future specification.

  export async function getItemDataById() {
    var component = this;

    this.itemsDataReset();

    var activeId = this.getActiveIdFromAttribute();
    var res = []
    if (activeId !== null) {
      const ids = activeId.split(",");
     // console.log('active id in get item data', ids)
      // TODO: Getting multi interview data
      await Promise.all(ids.map(async (id) => {
        component.tempResult = null;
        var response = await component.getAPIResource('items/' + id,'tempResult');
        this.itemsDataSetItem(id, component.tempResult);
        component.tempResult = null;
        //console.log('item response', response)
        res.push(response)
      }));
    
    //console.log('res list: ', res)
    // TODO: return all
    return res;
    }
  }

  // @method getAssociatedEntitiesByType()
  // @description Retrieves all Entities associated with an entry and filtered by entity
  //   type. For instance, this can be used to retrieve all places mentioned in a transcript.
  // @param storeObject An object to assign the value
  // @param property The property of that object to assign the value (property name as string)
  // @param id The id of the entity
  // @param type The type of entity to cross reference. Accepts
  //   events|locations|people|places|transcripts
// TODO: Makes an object mapping id to dict of all entities - make use of this in the map tool 
export async function getAssociatedEntitiesByType(storeObject,property,id=null,type='people') {
    var component = this;

    if(id==null) {
      var id = this.getActiveIdFromAttribute();
    }
    var res = []
    if (id !== null) {
      const ids = id.split(",");
      // console.log('active id in get associated entity data', ids)
      // console.log('entity list in associated entity before: ', this.multiInterview)

      // TODO: Getting multi interview data
      await Promise.all(ids.map(async (id) => {
        component.tempResult = null;
        var response = await component.getAPIResource("items/" + id + "/" + type,'tempResult');
        //storeObject[property] = component.tempResult; // assign by reference
        // console.log('id', id, 'property', property, 'temp result', component.tempResult)
        if(!this.multiInterview.hasOwnProperty(id)) {
          var color = Math.floor(Math.random()*16777215).toString(16);
          color = '#' + color;
          var border = this.shadeColor(color)
          
          this.multiInterview[id] = {
            "dates": [],
            "events": [],
            "organizations":  [],
            "persons": [],
            "places": [],
            "tei_uri": "",
            "title": "",
            "transcript": "",
            "uri": "",
            'color': "",
            'border': ''
          } 
          
          for(const key in this.multiInterview[id]) {
            this.multiInterview[id][key] = component.tempResult[key]
          }
          this.multiInterview[id].color = color;
          this.multiInterview[id].border = border;
            //storeObject[property] = this.multiInterview
          
        }
        // if(property === 'multiInterview' || property === '') {
        //   for(const key in this.multiInterview[id]) {
        //     this.multiInterview[id][key] = component.tempResult[key]
        //   }
        storeObject[property] = this.multiInterview
        // }
        res.push(response)
      }));
    storeObject[property] = this.multiInterview
    // console.log('entity list in associated entity after: ', this.multiInterview)
    // // TODO: return all
    return res;
    }
  }


export function itemsDataReset() {
    this.items = {};
  }

  // @method itemsDataSetItem()
  // @description Sets the object's active item data property. This property
  //   stores the full item object (i.e. a transcript) keyed by id. Note that
  //   it does not retrieve remote data, it's just a setter.

  export function itemsDataSetItem(id,data) {
    this.items[id] = data;
  }

  // @method getItemData()
  // @description Returns a single item from the itemData property.

  export function getItemData() {
    var item = {};

    for (const prop in this.items) {
      item = this.items[prop];
    }

    return item;
  }

  export function shadeColor(color) {
      var percent = -25;
      var R = parseInt(color.substring(1,3),16);
      var G = parseInt(color.substring(3,5),16);
      var B = parseInt(color.substring(5,7),16);

      R = parseInt(R * (100 + percent) / 100);
      G = parseInt(G * (100 + percent) / 100);
      B = parseInt(B * (100 + percent) / 100);

      R = (R<255)?R:255;  
      G = (G<255)?G:255;  
      B = (B<255)?B:255;  

      var RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
      var GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
      var BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

      return "#"+RR+GG+BB;
  }
  // @method getActiveIdFromAttribute()
  // @description Retrieves the current active ID from the componentÃs ddhi-active-id  attribute.
  // @return A single active ID. Null if no ID is present.

  export function getActiveIdFromAttribute() {
    return this.getAttribute('ddhi-active-id');
  }

  // @method setData()
  // @description Attach arbitrary data to this element.

  export function setData(prop,data) {
    this[prop] = data;
  }

  // @method closestElement()
  // @description Handy utility function courtesy of
  //   https://stackoverflow.com/questions/54520554/custom-element-getrootnode-closest-function-crossing-multiple-parent-shadowd

  export function closestElement(selector, base = this) {
    function __closestFrom(el) {
      if (!el || el === document || el === window) return null;
      let found = el.closest(selector);
      if (found)
        return found;
      else
        __closestFrom(el.getRootNode().host);
    }

    return __closestFrom(base);
  }

  // @method getMentionedEntities()
  // @description Retrieves the entities mentioned in an item.
  //  cross references them with actual mentions in the transcript to get
  //  ordinal information. The result is a flat set of entity objects.

  export function getMentionedEntities(item=null,setProperty=true) {
    var component = this;

    if (item==null) {
      item = this.getItemData();
    }

    var mentionedEntities = {};

    this.supportedEntityTypes.forEach(function(e,i){
      if (item.hasOwnProperty(e)) {
        item[e].forEach(function(entity) {
          if(!entity.title){
            entity.title = entity.when;
            entity.resource_type = 'date';
          }
          mentionedEntities[entity.id] = entity;
        });
      }
    });

    if (setProperty==true) {
      this.mentionedEntities = mentionedEntities;
    }
    return mentionedEntities;
  }

  // @method getEntitiesByOrderOfMention()
  // @description Returns an array of entity ids in the order that they appear in the
  //  transcript. Entity details can then retrieved from the mentionedEntities property.

  export function getEntitiesByOrderOfMention(item=null) {
    if (item==null) {
      item = this.getItemData();
    }

    var orderedEntities = [];

    // Thank you https://davidwalsh.name/convert-html-stings-dom-nodes !

    let transcript = document.createRange().createContextualFragment(item.transcript);

    transcript.querySelectorAll('span, date').forEach(function (e){
      if (e.hasAttribute('data-entity-id')) {
        orderedEntities.push(e.getAttribute('data-entity-id'));
      }
      else if (e.hasAttribute('id')) {
        
        orderedEntities.push(e.getAttribute('id'));
        // e.setAttribute('data-entity-id', e.getAttribute('when'))
        // orderedEntities.push(e.getAttribute('data-entity-id'));
      }
    });
    return orderedEntities;
  }



  // @method renderValue()
  // @description View Helper that empties a target element of text and populates
  //   it with a new value.
  // @param element  The target element
  // @param value The replacement value


  export function renderValue(element,value) {
    // Check that element exists.
    if (typeof element == 'undefined') {
      return;
    }
    element.textContent = "";
    var wrapper = document.createElement('div');
    wrapper.innerHTML = value;
    element.appendChild(wrapper.firstChild);
  }
