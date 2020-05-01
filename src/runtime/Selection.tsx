import * as React from "react"


export default class Selection extends React.Component {

    render() {

        let options = Object.entries(this.props.options).map((i) => {
            return (
                <option value={i[1]}>{i[0].toUpperCase()}</option>
            )
        })

        return (
            <select id={this.props.id}> {options} </select>
        )

    }

}