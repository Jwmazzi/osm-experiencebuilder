import { React, jsx } from "jimu-core"
import { BaseWidgetSetting, AllWidgetSettingProps } from "jimu-for-builder"
import { JimuMapViewSelector } from "jimu-ui/setting-components"
import { IMConfig } from '../config'


export default class Setting extends BaseWidgetSetting<AllWidgetSettingProps<any>, any> {

    onMapWidgetSelected = (useMapWidgetIds: string[]) => {
        this.props.onSettingChange({
            id: this.props.id,
            useMapWidgetIds: useMapWidgetIds
        })
    }

    render() {
        return(
            <div>
                <p>OSM Exploration Extent</p>
                <JimuMapViewSelector
                useMapWidgetIds={this.props.useMapWidgetIds}
                onSelect={this.onMapWidgetSelected}
                />
            </div>
        ) 
    }

}