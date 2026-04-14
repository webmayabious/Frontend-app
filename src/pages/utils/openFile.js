// import Share from 'react-native-share';
// // import FileViewer from 'react-native-file-viewer'
// import { Alert } from "react-native";

// export const openFile = async (path) => {
//   try {
//     await Share.open({
//       url: 'file://' + path,
//       type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//       title: 'Open File',
//       failOnCancel: false,
//       // On Android, this shows the chooser explicitly
//       showAppsToView: true, 
//     });
//   } catch (err) {
//     console.log('Error opening file:', err);
//   }
// };
// import Share from 'react-native-share';
// import RNFS from 'react-native-fs';

// export const openFile = async (path) => {
//   // 1. Ensure the path has the file:// prefix for the sharing library
//   const cleanPath = path.replace('file://', '');
//   const formalPath = `file://${cleanPath}`;

//   try {
//     // 2. Double check file exists so we don't crash
//     const exists = await RNFS.exists(cleanPath);
//     if (!exists) {
//       console.log("File missing at:", cleanPath);
//       return;
//     }

//     // 3. Use the 'open' method which triggers the "Open With" dialog
//     await Share.open({
//       url: formalPath,
//       type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//       title: 'Open Excel File',
//       failOnCancel: false, // Prevents an error if user just clicks away
//     });
//   } catch (err) {
//     // If no app is found, Share will catch it here
//     console.log('Share Error:', err);
//   }
// };

import FileViewer from 'react-native-file-viewer';
import { Alert, Platform } from 'react-native';

export const openFile = async (path) => {
  // IMPORTANT: For Android, FileViewer needs the absolute path 
  // WITHOUT the 'file://' prefix for its internal FileProvider logic to work best
  const cleanPath = Platform.OS === 'android' ? path.replace('file://', '') : path;

  try {
    await FileViewer.open(cleanPath, {
      showOpenWithDialog: true,
      displayName: 'Mulyam Excel Format', // Helps some viewers identify the file
    });
  } catch (error) {
    console.log('FileViewer Error:', error);
    Alert.alert("Error", "Could not find an app to open this Excel file. Please ensure Excel or WPS Office is installed.");
  }
};