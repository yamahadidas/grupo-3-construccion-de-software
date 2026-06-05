"use client";
import { Slider, HStack, Stack, VStack, Box, Grid, GridItem } from "@chakra-ui/react"
import { Checkbox, CheckboxGroup, Fieldset, For, Card, Heading, Flex, Text } from "@chakra-ui/react"






const mes = [
  { value: 100, label: "Enero" },
  { value: 91, label: "Febrero" },
  { value: 82, label: "Marzo" },
  { value: 73, label: "Abril" },
  { value: 64, label: "Mayo" },
  { value: 55, label: "Junio" },
  { value: 45, label: "Julio" },
  { value: 36, label: "Agosto" },
  { value: 27, label: "Septiembre" },
  { value: 18, label: "Octubre" },
  { value: 9, label: "Noviembre" },
  { value: 0, label: "Diciembre" }
]

export default function Home() {
  return (
    <VStack gap={4} p={6} w="100%" minH="100vh" bg="gray.50" align="stretch">
      {/* SECCIÓN SUPERIOR */}
      <Box 

        h="120px" 
        w="100%" 
        bg="white"
        
        >
        <Flex justify="center" align="center" h="100%">
          <Text textStyle="5xl" fontWeight="semibold" color="black">
            ¡ ¡ ¡ Timeline G3 ! ! !
          </Text>
        </Flex>
          

      </Box>


      {/* SECCIÓN INFERIOR */}

      
      <Grid 
        templateColumns="1fr 1fr 6fr" // Los numeros que acompañan al fr cunto espacio ovupara cada columna
        gap={4} 
        w="100%"
        flex="1" // Hace que el grid ocupe todo el espacio vertical restante

      
      >
        {/* columnas categorias */}
        <GridItem 
          bg="white"
          p={4}
        >
          {/* codigo categorias */}
          <Fieldset.Root>
            <CheckboxGroup defaultValue={["react"]} name="framework">
              <Fieldset.Legend fontSize="sm" mb="2">
                Categorias
              </Fieldset.Legend>
              <Fieldset.Content>
                <For each={["Evaluaciones", "Feriados", "Docencia", "Inscripciones", "Posgrado"]}>
                  {(value) => (
                    <Checkbox.Root key={value} value={value}>
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label color='#000000'>{value}</Checkbox.Label>
                    </Checkbox.Root>
                  )}
                </For>
              </Fieldset.Content>
            </CheckboxGroup>
          </Fieldset.Root>
        </GridItem>

        {/* columna slider */}
        <GridItem 
          bg="white"
          p={4}
        >
          {/* copdigo slider */}
          <Slider.Root
            height="400px"
            orientation="vertical"
            colorPalette="#000000"
            defaultValue={[100]}
            origin='end'
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumbs />
              <Slider.Marks marks={mes} color='#000000' />
            </Slider.Control>
          </Slider.Root>
        </GridItem>

        {/* columna informacion */}
        <GridItem 
          bg="white"
          p={4}
        >
          {/* codigo informacion */}
          <Grid templateColumns="repeat(3, 1fr)" gap="6">
            {/* columna central */}
            <GridItem />
              <Card.Root size="md">
                <Card.Header>
                  <Heading size="md"> Card - md</Heading>
                </Card.Header>
                <Card.Body color="fg.muted">
                  hola
                </Card.Body>
              </Card.Root>
            {/* columna izquierda */}
            <GridItem />
              <Card.Root size="lg">
                <Card.Header>
                  <Heading size="md"> Card - lg</Heading>
                </Card.Header>
                <Card.Body color="fg.muted">
                  This is the card body. Lorem ipsum dolor sit amet, consectetur
                  adipiscing elit.
                </Card.Body>
              </Card.Root>
            {/* columna derecha */}
            <GridItem />
              
          </Grid>
        </GridItem>
      </Grid>
    </VStack>
  )
}
