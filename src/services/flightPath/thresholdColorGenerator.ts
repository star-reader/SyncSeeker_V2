export default (altitude: number) => {
    const colorSet = [
        {color: '#0046a9'}, {color: '#004cad'}, {color: '#0054b3'},
        {color: '#005ebb'}, {color: '#0068c3'}, {color: '#0072cb'},
        {color: '#007ed5'}, {color: '#008bdd'}, {color: '#0097e6'},
        {color: '#00a1ed'}, {color: '#01adf3'}, {color: '#01b7f9'},
        {color: '#00befd'}, {color: '#00c9ff'}, {color: '#00cfff'},
        {color: '#00d5ff'}, {color: '#00d9fb'}, {color: '#00dbed'},
        {color: '#01dbe3'}, {color: '#00dbd9'}, {color: '#00dbcb'},
        {color: '#00dbc1'}, {color: '#00dbb3'}, {color: '#01dba5'},
        {color: '#00db99'}, {color: '#00db8b'}, {color: '#00db7e'},
        {color: '#01db72'}, {color: '#00db68'}, {color: '#00db5e'},
        {color: '#06db56'}, {color: '#11dd4e'}, {color: '#20df46'},
        {color: '#30df40'}, {color: '#42e138'}, {color: '#56e330'},
        {color: '#6ae32a'}, {color: '#81e524'}, {color: '#95e51e'},
        {color: '#a9e518'}, {color: '#bde512'}, {color: '#cfe50e'},
        {color: '#dfe50a'}, {color: '#eee506'}, {color: '#f9e502'},
        {color: '#ffe300'}, {color: '#ffe000'}, {color: '#ffdb01'},
        {color: '#ffd900'}, {color: '#ffd500'}, {color: '#ffd100'},
        {color: '#ffcb00'}, {color: '#ffc700'}, {color: '#ffc300'}]
    
        const altitudeThresholds = [
            250,500,750,1000,1250,1500,
            2000,3000,4000,5000,6000,7000,
            8000,9000,10000,11000,12000,13000,
            14000,15000,16000,17000,18000,19000,
            20000,21000,22000,23000,24000,25000,
            26000,27000,28000,29000,30000,31000,
            32000,33000,34000,35000,36000,37000,
            38000,39000,40000,41000,42000,43000,
            44000,45000,47000,49000,50000,100000
        ]
        
        //根据高度检索不同颜色
        for (let i = 0; i < altitudeThresholds.length; i++){
            if (altitude <= altitudeThresholds[i]) {
                return colorSet[i].color
            }
        }
        return colorSet[18].color
}
