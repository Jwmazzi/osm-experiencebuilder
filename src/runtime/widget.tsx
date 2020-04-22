/** @jsx jsx */
import { AllWidgetProps, BaseWidget, jsx } from 'jimu-core';
import { JimuMapViewComponent, JimuMapView } from "jimu-arcgis"
import { IMConfig } from '../config'
import Selection from './Selection'

import SpatialReference = require("esri/geometry/SpatialReference")
import Projection = require("esri/geometry/projection")
import Graphic = require("esri/Graphic")
import Point = require("esri/geometry/Point")

import axios = require('axios')
import { link } from 'fs';

export default class Widget extends BaseWidget<AllWidgetProps<IMConfig>, any> {

  constructor(props) {
    super(props)

    this.state = {
      JimuMapView: null,
      osm: this.props.config.osm,
      elements: [],
      markerSymbol: {
        type: "simple-marker",
        color: [226, 119, 40],
        outline: {
          color: [255, 255, 255],
          width: 2
        }
      }
    }
  }

  processElements = (osmElements) => {

    let graphics = osmElements.slice(0, 100).map((el) => {
      return Graphic({
        geometry: {type: 'point', longitude: el.lon, latitude: el.lat},
        symbol: this.state.markerSymbol,
        attributes: el.tags,
        fetching: false
      })
    })

    return graphics
    
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

      let main = `${ele}["${tag}"]${box}`
      let args = [this.state.osm.format, main, this.state.osm.output]

      this.setState({fetching: true})

      axios.post(this.state.osm.osmapi, args.join(';')).then((res) => {

        let geomList = this.processElements(res.data.elements)
  
        if (geomList.length > 0) {
          this.state.jimuMapView.view.graphics.addMany(geomList)
          this.setState({
            elements: geomList,
            fetching: false
          })
        } else {
          this.setState({
            elements: [],
            fetching: false
          })
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
