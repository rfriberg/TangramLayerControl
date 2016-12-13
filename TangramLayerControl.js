
var TangramLayerControl = L.Control.extend({
  options: {
    collapsed: true,
    position: 'topright'
  },

  initialize: function (layers, options) {
    L.setOptions(this, options);

    this._layers = [];

    for (i in layers) {
      this._layers.push({
        layer: layers[i],
        name: i
      });
    }
  },

  onAdd: function (map) {
    this._initLayout();
    this._update();
    this._map = map;

    if (!this._scene) {
      var self = this;

      // Set _scene once Tangram is available
      this._map.on('tangramloaded', function(e) {
        self._scene = e.tangramLayer.scene;

        // Just for testing:
        console.log('Available layers: ' + self._getListOfAvailableLayers());
      });
    }
 
    return this._container;
  },

  // @method expand(): this
  // Expand the control container if collapsed.
  expand: function () {
    L.DomUtil.addClass(this._container, 'leaflet-control-layers-expanded');
    this._form.style.height = null;
    var acceptableHeight = this._map.getSize().y - (this._container.offsetTop + 50);
    if (acceptableHeight < this._form.clientHeight) {
      L.DomUtil.addClass(this._form, 'leaflet-control-layers-scrollbar');
      this._form.style.height = acceptableHeight + 'px';
    } else {
      L.DomUtil.removeClass(this._form, 'leaflet-control-layers-scrollbar');
    }
    return this;
  },

  // @method collapse(): this
  // Collapse the control container if expanded.
  collapse: function () {
    L.DomUtil.removeClass(this._container, 'leaflet-control-layers-expanded');
    return this;
  },

  _initLayout: function () {
    // TODO: customize skin?
    var className = 'leaflet-control-layers',
        container = this._container = L.DomUtil.create('div', className),
        collapsed = this.options.collapsed;

    // makes this work on IE touch devices by stopping it from firing a mouseout event when the touch is released
    container.setAttribute('aria-haspopup', true);

    L.DomEvent.disableClickPropagation(container);
    if (!L.Browser.touch) {
      L.DomEvent.disableScrollPropagation(container);
    }

    var form = this._form = L.DomUtil.create('form', className + '-list');

    if (collapsed) {
      this._map.on('click', this.collapse, this);

      if (!L.Browser.android) {
        L.DomEvent.on(container, {
          mouseenter: this.expand,
          mouseleave: this.collapse
        }, this);
      }
    }

    var link = this._layersLink = L.DomUtil.create('a', className + '-toggle', container);
    link.href = '#';
    link.title = 'Layers';

    if (L.Browser.touch) {
      L.DomEvent
          .on(link, 'click', L.DomEvent.stop)
          .on(link, 'click', this.expand, this);
    } else {
      L.DomEvent.on(link, 'focus', this.expand, this);
    }

    // work around for Firefox Android issue https://github.com/Leaflet/Leaflet/issues/2033
    L.DomEvent.on(form, 'click', function () {
      setTimeout(L.bind(this._onInputClick, this), 0);
    }, this);

    if (!collapsed) {
      this.expand();
    }

    this._layersList = L.DomUtil.create('div', className + '-layers', form);

    container.appendChild(form);
  },

  _update: function () {
    if (!this._container) { return this; }

    L.DomUtil.empty(this._layersList);

    for (i = 0; i < this._layers.length; i++) {
      obj = this._layers[i];
      this._addItem(obj);
    }

    return this;
  },

  _addItem: function (obj) {
    var label = document.createElement('label'),
        checked = true, //this._map.hasLayer(obj.layer),
        input = document.createElement('input');

    input.type = 'checkbox';
    input.className = 'leaflet-control-layers-selector';
    input.value = obj.layer;
    input.defaultChecked = checked;

    L.DomEvent.on(input, 'click', this._onInputClick, this);

    var name = document.createElement('span');
    name.innerHTML = ' ' + obj.name;

    // Helps from preventing layer control flicker when checkboxes are disabled
    // https://github.com/Leaflet/Leaflet/issues/2771
    var holder = document.createElement('div');

    label.appendChild(holder);
    holder.appendChild(input);
    holder.appendChild(name);

    var container = this._layersList;
    container.appendChild(label);

    return label;
  },

  _onInputClick: function () {
    var inputs = this._form.getElementsByTagName('input');

    for (var i = inputs.length - 1; i >= 0; i--) {
      var input = inputs[i];
      var layer_name = input.value;

      this._toggleLayer(layer_name, input.checked);
    }

    this._refocusOnMap();
  },

  /**
   * _toggleLayer: Turn Tangram layer on/off
   * @param  {string} layer_name  Tangram layer name
   * @param  {boolean} visible    Intended visibility
   */
  _toggleLayer: function (layer_name, visible) {
    if (!this._scene) {
      console.log("Error: no Tangram scene available to update");
      return;
    }

    var tLayer = this._getLayer(layer_name);
    var currently_visible = (tLayer.visible === undefined) ? true : tLayer.visible;

    if (currently_visible !== visible) {
      tLayer.visible = visible;

      // The documented way:
      //this._scene.updateConfig();

      // The undocumented (but more performant) way:
      this._scene.rebuild({layers: [tLayer]});
    }
  },

  _getLayer: function (layer_name) {
    var layersObj = this._scene.config.layers;

    if (layersObj.hasOwnProperty(layer_name)) {
      return layersObj[layer_name]
    }

    // Iterate through layers to find possible sublayer (only looks 1 level deep)
    for (let layer in layersObj) {

      if (layersObj[layer].hasOwnProperty(layer_name)) {
        return layersObj[layer][layer_name]
      }
    }

    // TODO handle additionally nested sublayers?
    console.log("Error: Layer not found");
  },

  // Used for testing only
  _getListOfAvailableLayers: function () {
    var layersObj = this._scene.config.layers;

    return Object.keys(layersObj);
  }


});


// @factory L.control.layers(overlays?: Object, options?: Control.Layers options)
L.control.tangramLayerControl = function (overlays, options) {
  return new TangramLayerControl(overlays, options);
};