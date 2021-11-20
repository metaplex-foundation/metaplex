#python janeApe.py
#Created by Conor Holds | twitter.com/ConorHolds

#### NOTES ABOUT THIS SCRIPT ####
#Requires a PSD file containing all possible variants of the art you want to generate. 
# All layers in the PSD file should be hidden before running this script.


#### PACKAGE IMPORTS ####
from psd_tools import PSDImage
import random
import csv
import os
import time
import json
import sys, getopt

from psd_tools.psd.image_resources import LayerGroupEnabledIDs
####~~~ END OF PACKAGE IMPORTS ~~~####



def showLayers(psd, layer, sub_layer=None):
    print("Setting layer to visible - " + str(layer), str(sub_layer))

    group_layer = next(filter(lambda x: x.name == layer, psd))
    if group_layer.is_group():
        if sub_layer:
            group_child_layer = next(filter(lambda x: x.name == sub_layer, group_layer))
            group_child_layer.visible = True
        else:
            for layer in group_layer:
                layer.visible = True
    group_layer.visible = True

    return psd


def saveImage(psd, individualImageNumber, outputFolder):
    image = psd.composite(force = True)
    nameForImage = str(individualImageNumber) + ".png"
    pathForImage = os.path.join(outputFolder, nameForImage)
    image.save(pathForImage)
    return


##The main image creation step##
def createImages (photoshop_file, traits_file, output_dir, effects_layer, offset):
    f = open(traits_file)
 
    data = json.load(f)
    individual_image_number = offset
    for data_set in data[offset:]:
        psd = PSDImage.open(photoshop_file)

        print("Starting to create image number: " + str(individual_image_number))
   
        for val in data_set.items():
            if val[0] != "id" and val[1] != "No Traits":
                psd = showLayers(psd, val[0], val[1])
        if effects_layer:
            psd = showLayers(psd, effects_layer, None)
     
        saveImage(psd, individual_image_number, output_dir)
        
        print("Finished creating image number: " + str(individual_image_number))
        print("-----------------------------------------------------")
        individual_image_number += 1

####~~~ END OF GENERATIVE ART FUNCTIONS ~~~####


#### THE MAIN PROGRAM ####
def main(photoshop_file, output_dir, traits_file, effects_layer, offset):  
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    createImages (photoshop_file, traits_file, output_dir, effects_layer, offset)
    return print('Program Completed')

####~~~ END THE MAIN PROGRAM ~~~####


#### RUN THE PROGRAM ####
if __name__ == "__main__":
    argv = sys.argv[1:]
    photoshop_file = ''
    output_dir = ''
    traits_file = ''
    offset = 0
    effects_layer = None
    if len(argv) == 0:
        print('psd_layer_generator.py -p <psd> -o <output directory> -t <traits json> -e <effects layer> -n <offset>')
        sys.exit(2)
    try:
        opts, args = getopt.getopt(argv,"hp:o:t:e:n:")
    except getopt.GetoptError:
        print('psd_layer_generator.py -p <psd> -o <output directory> -t <traits json> -e <effects layer> -n <offset>')
        sys.exit(2)
    for opt, arg in opts:
        if opt == '-h':
            print('psd_layer_generator.py -p <psd> -o <output directory> -t <traits json> -e <effects layer> -n <offset>')
            sys.exit()
        elif opt in ("-p"):
            photoshop_file = arg
        elif opt in ("-o"):
            output_dir = arg
        elif opt in ("-t"):
            traits_file = arg
        elif opt in ("-e"):
            effects_layer = arg
        elif opt in ("-n"):
            offset = int(arg)
    main(photoshop_file, output_dir, traits_file, effects_layer, offset)