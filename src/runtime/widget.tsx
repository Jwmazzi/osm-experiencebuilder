/** @jsx jsx */
import { AllWidgetProps, BaseWidget, jsx } from 'jimu-core';
import { JimuMapViewComponent, JimuMapView } from "jimu-arcgis"
import { IMConfig } from '../config'
import Selection from './Selection'

import CalciteThemeProvider from 'calcite-react/CalciteThemeProvider'
import { CalciteH4 } from 'calcite-react/Elements'
import Loader from 'calcite-react/Loader'
import Form, { FormControl } from 'calcite-react/Form'
import Button from 'calcite-react/Button'

import SpatialReference = require("esri/geometry/SpatialReference")
import Projection = require("esri/geometry/projection")
import Graphic = require("esri/Graphic")
import Point = require("esri/geometry/Point")

import axios = require('axios')

require('./stylesheets/style.scss')


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

    let graphics = osmElements.slice(0, 500).map((el) => {
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

  processWays = (osmElements, geoType) => {

    if (geoType === 'LINE') {
      var ways = osmElements.filter(el => el.type === 'way' && el.nodes[0] != el.nodes.slice(-1)[0])
    }  else {
      var ways = osmElements.filter(el => el.type === 'way' && el.nodes[0] == el.nodes.slice(-1)[0])
    }
    
    let graphics = ways.slice(0, 500).map((el) => {

      if (geoType === 'LINE') {
        var g = {type: 'polyline', paths: el.geometry.map((el) => {return [el.lon, el.lat]})}
        var s = this.props.config.lineSymbol
      } else {
        var g = {type: 'polygon', rings: el.geometry.map((el) => {return [el.lon, el.lat]})}
        var s = this.props.config.polySymbol
      }

      return Graphic({
        geometry: g,
        symbol: s,
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

    this.state.jimuMapView.view.graphics.removeAll()

    let extent = this.state.jimuMapView.view.extent

    // TODO - Verify Extent not WGS 84 Before Attempting Projection
    Projection.load().then(() => {

      let min = Point({x: extent.xmin, y: extent.ymin, spatialReference: new SpatialReference(3857)})
      let max = Point({x: extent.xmax, y: extent.ymax, spatialReference: new SpatialReference(3857)})
      let prj = Projection.project([min, max], new SpatialReference(4326))
      let box = `(${prj[0].y}, ${prj[0].x}, ${prj[1].y}, ${prj[1].x})`

      let geo = document.getElementById('etypes').selectedOptions[0].innerHTML
      let ele = document.getElementById('etypes').selectedOptions[0].value
      let tag = document.getElementById('osmtags').selectedOptions[0].value

      let args = this.getOSMQuery(ele, tag, box)

      this.setState({fetching: true})

      axios.post(this.state.osm.osmapi, args).then((res) => {

        if (ele === 'node') {
          var geomList = this.processNodes(res.data.elements)
        } else {
          var geomList = this.processWays(res.data.elements, geo)
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

    if (this.state.fetching) return <Loader />

    return (
      <CalciteThemeProvider>
        <div style={{margin: '25px'}}>
          <CalciteH4 style={{textAlign: "center"}}>OSM Viewer</CalciteH4>
          <Form>
            <Selection id="etypes" options={this.state.osm.etypes}/>
            <Selection id="osmtags" options={this.state.osm.osmtag}/>
            <Button style={{marginTop: "5px"}} green onClick={this.fetchOSM}>Fetch OSM</Button>
          </Form>
          <CalciteH4 style={{textAlign: "center", marginTop: "25px"}}>Elements In Current Extent: {this.state.elements.length}</CalciteH4>
        </div>
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
      </CalciteThemeProvider>
    )
  }

}
