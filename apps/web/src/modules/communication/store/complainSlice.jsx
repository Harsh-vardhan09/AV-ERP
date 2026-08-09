import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
    complains:[]
}

export const complainData = createAsyncThunk('complainsData',async()=>{
    const data = await axios.get(`${import.meta.env.VITE_PORT}/api/v1/complains`);
    return data.data;
})

export const Complains = createSlice({
    name:"complainSlice",
    initialState,
    reducers:{},
    extraReducers:(builder)=>{
        builder.addCase(complainData.fulfilled,(state,action)=>{
            state.complains = action.payload;
        })
        builder.addCase(complainData.pending,()=>{})
    }
}) 

export default Complains.reducer