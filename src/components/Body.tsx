import React, { Component } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import styled from 'styled-components'

type Props = {}

type State = {}
const styles = {
    
}
export default class Body extends Component<Props, State> {
  state = {}
  
  render() {
    return (
      <div style={styles}><Sidebar></Sidebar><Navbar></Navbar></div>
    )
  }
}