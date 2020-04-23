/** @jsx jsx */
import { AllWidgetProps, BaseWidget, jsx } from 'jimu-core';
import { JimuMapViewComponent, JimuMapView } from "jimu-arcgis"
import { IMConfig } from '../config'
import Selection from './Selection'

import SpatialReference = require("esri/geometry/SpatialReference")
import Projection = require("esri/geometry/projection")
import Graphic = require("esri/Graphic")
import Polyline = require("esri/geometry/Polyline")
import Point = require("esri/geometry/Point")

import axios = require('axios')
import { ConsoleReporter } from 'jasmine';


export default class Widget extends BaseWidget<AllWidgetProps<IMConfig>, any> {

  constructor(props) {
    super(props)

    this.state = {
      osm: this.props.config.osm,
      JimuMapView: null,
      elements: []
    }
  }

  handleTags(tagObj) {

    let tagList = ''

    for (let [tag, val] of Object.entries(tagObj)) {
      tagList += `<tr><td>${tag}</td><td>${val}</td></tr>`
    }

    return `<table>${tagList}</table>`

  }

  processNodes = (osmElements) => {

    let graphics = osmElements.slice(0, 100).map((el) => {
      console.log(JSON.stringify(el.tags))
      console.log(el)
      return Graphic({
        geometry: {type: 'point', longitude: el.lon, latitude: el.lat},
        symbol: this.props.config.pointSymbol,
        attributes: el.tags,
        popupTemplate: {
          title: `OSM ID: ${el.id}`,
          content: this.handleTags(el.tags)
        }
      })
    })

    return graphics
    
  }

  processWays = (osmElements) => {

    let ways = osmElements.filter(el => el.type === 'way')
    
    let graphics = ways.slice(0, 100).map((el) => {

      return Graphic({
        geometry: {type: 'polyline', paths: el.geometry.map((el) => {return [el.lon, el.lat]})},
        symbol: this.props.config.lineSymbol,
        attributes: el.tags,
        popupTemplate: {
          title: `OSM ID: ${el.id}`,
          content: this.handleTags(el.tags)
        }
      })

    })

    return graphics

  }

  getOSMQuery = (element, tag, boundary) => {

    let main = `${element}["${tag}"]${boundary}`
    let args = [this.state.osm.format, main, this.state.osm.output]

    return args.join(';')
    
  }

  fetchOSM = () => {

    let extent = this.state.jimuMapView.view.extent

    // TODO - Verify Extent not WGS 84 Before Attempting Projection
    Projection.load().then(() => {

      let min = Point({x: extent.xmin, y: extent.ymin, spatialReference: new SpatialReference(3857)})
      let max = Point({x: extent.xmax, y: extent.ymax, spatialReference: new SpatialReference(3857)})
      let prj = Projection.project([min, max], new SpatialReference(4326))
      let box = `(${prj[0].y}, ${prj[0].x}, ${prj[1].y}, ${prj[1].x})`

      let ele = document.getElementById('etypes').selectedOptions[0].value
      let tag = document.getElementById('osmtags').selectedOptions[0].value

      let args = this.getOSMQuery(ele, tag, box)

      this.setState({fetching: true})

      axios.post(this.state.osm.osmapi, args).then((res) => {

        if (ele === 'node') {
          var geomList = this.processNodes(res.data.elements)
        } else {
          var geomList = this.processWays(res.data.elements)
        }
  
        if (geomList.length > 0) {
          this.state.jimuMapView.view.graphics.addMany(geomList)
          this.setState({elements: geomList, fetching: false})
        } else {
          this.setState({elements: [], fetching: false})
        }

      }).catch(err => {console.log(err); this.setState({fetching: false})})

    })

  }

  activeViewChangeHandler = (jmv: JimuMapView) => {

    if (jmv) this.setState({jimuMapView: jmv})

  }

  render() {

    if (this.state.fetching) return <p>Fetching OSM Data . . .</p>

    return (
      <div>
        <p>OSM Viewer</p>
        <Selection id="etypes" options={this.state.osm.etypes}/>
        <Selection id="osmtags" options={this.state.osm.osmtag}/>
        <button onClick={this.fetchOSM} type="button">Fetch OSM</button>
        {
        this.props.hasOwnProperty("useMapWidgetIds") &&
        this.props.useMapWidgetIds &&
        this.props.useMapWidgetIds.length === 1 && (
          <JimuMapViewComponent
            useMapWidgetIds={this.props.useMapWidgetIds}
            onActiveViewChange={this.activeViewChangeHandler}
          />
          )
        }
        <p>Elements In Current Extent: {this.state.elements.length}</p>
      </div>
    )

  }
}
