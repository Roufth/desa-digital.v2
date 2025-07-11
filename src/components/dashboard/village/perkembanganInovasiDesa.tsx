import {
  Box,
  Flex,
  Text,
  Button,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerCloseButton,
  Checkbox,
  SimpleGrid,
} from "@chakra-ui/react";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Filter } from "lucide-react";
import * as XLSX from "xlsx";
import { DownloadIcon } from "@chakra-ui/icons";

const PerkembanganInovasiDesa: React.FC = () => {
  const [barData, setBarData] = useState<{ name: string; value: number }[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [allYears, setAllYears] = useState<string[]>([]);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchInovasiData = async () => {
    try {
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.error("User belum login");
        return;
      }

      const desaQuery = query(
        collection(db, "villages"),
        where("userId", "==", user.uid)
      );
      const desaSnap = await getDocs(desaQuery);

      let namaDesa = "";
      if (!desaSnap.empty) {
        const desaData = desaSnap.docs[0].data();
        namaDesa = desaData?.namaDesa?.toLowerCase().trim() || "";
      } else {
        console.warn("Desa tidak ditemukan");
        return;
      }

      // Ambil data klaim inovasi terkait desa ini
      const claimQuery = query(
        collection(db, "claimInnovations"),
        where("desaId", "==", user.uid)
      );
      const claimSnap = await getDocs(claimQuery);

      // Menghitung jumlah klaim per tahun berdasarkan createdAt
      const yearCount: Record<string, number> = {};

      claimSnap.forEach((doc) => {
        const data = doc.data();
        const createdAt = data?.createdAt?.toDate(); // Pastikan createdAt adalah Timestamp yang bisa diubah ke Date

        if (createdAt) {
          const year = createdAt.getFullYear().toString(); // Ambil tahun dari createdAt

          // Tambahkan jumlah klaim per tahun
          yearCount[year] = (yearCount[year] || 0) + 1;
        }
      });

      // Mengambil semua tahun yang tersedia dan mengurutkannya
      const allYearsList = Object.keys(yearCount).sort();
      setAllYears(allYearsList);

      // Filter berdasarkan tahun yang dipilih (selectedYears) atau tampilkan semua tahun
      const filteredYears = selectedYears.length > 0 ? selectedYears : allYearsList;

      // Siapkan data untuk chart
      const chartData = filteredYears.map((year) => ({
        name: year,
        value: yearCount[year] || 0, // Jika tidak ada klaim untuk tahun ini, nilai = 0
      }));

      console.log("✅ yearCount:", yearCount);
      console.log("✅ chartData:", chartData);

      setBarData(chartData);
    } catch (error) {
      console.error("❌ Error fetching innovation data:", error);
    }
  };

  useEffect(() => {
    fetchInovasiData();
  }, [selectedYears]);


  const handleCheckboxChange = (year: string) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const applyFilter = () => {
    onClose();
  };

  const handleDownload = () => {
    const excelData = barData.map((item, index) => ({
      No: index + 1,
      Tahun: item.name,
      "Jumlah Inovasi": item.value,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Perkembangan Inovasi");

    XLSX.writeFile(workbook, "perkembangan_inovasi_desa.xlsx");
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: any[];
    label?: string;
  }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;

      return (
        <div style={{ background: "white", padding: "10px", border: "1px solid #ccc" }}>
          <p style={{ margin: 0, fontWeight: "bold" }}>{label}</p>
          <p style={{ margin: 0 }}>Jumlah Inovasi: {data.value}</p> {/* Ubah ini */}
        </div>
      );
    }

    return null;
  };


  return (
    <Box>
      <Flex justify="space-between" align="center" mt="24px" mx="15px">
        <Text fontSize="sm" fontWeight="bold" color="gray.800">
          Perkembangan Inovasi Desa
        </Text>
        <Flex gap={2}>
          {/* <Button
            size="sm"
            bg="white"
            boxShadow="md"
            border="2px solid"
            borderColor="gray.200"
            px={2}
            py={2}
            display="flex"
            alignItems="center"
            gap={2}
            _hover={{ bg: "gray.100" }}
            cursor="pointer"
            onClick={handleDownload}
          >
            <DownloadIcon boxSize={3} color="gray.700" />
          </Button> */}
          <Button
            size="sm"
            bg="white"
            boxShadow="md"
            border="2px solid"
            borderColor="gray.200"
            px={2}
            py={2}
            display="flex"
            alignItems="center"
            _hover={{ bg: "gray.100" }}
            cursor="pointer"
            leftIcon={<Filter size={12} stroke="#1E5631" fill="#1E5631" />}
            onClick={onOpen}
          >
            <Text fontSize="10px" fontWeight="medium" color="black" mr={1}>
              Tahun
            </Text>
          </Button>
        </Flex>
      </Flex>

      <Box
        bg="white"
        borderRadius="xl"
        pt="5px"
        pb="1px"
        mx="15px"
        boxShadow="md"
        border="2px solid"
        borderColor="gray.200"
        mt={4}
        overflow="visible"
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={barData}
            margin={{ top: 20, right: 40, left: 1, bottom: 15 }}
            barSize={25}
          >
            <XAxis
              label={{
                value: "Tahun",
                position: "insideBottom",
                fontSize: 10,
                dx: 3,
                dy: 5,
              }}
              dataKey="name"
              tick={{ fontSize: 8 }}
              angle={0}
              textAnchor="middle"
              interval={0}
            />
            <YAxis
              label={{
                value: "Jumlah Inovasi",
                angle: -90,
                position: "insideLeft",
                fontSize: 10,
                dx: 15,
                dy: 40,
              }}
              tick={{ fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
            <Bar dataKey="value" fill="#1E5631" radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Drawer isOpen={isOpen} placement="bottom" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent
          sx={{
            borderTopRadius: "lg",
            width: "360px",
            my: "auto",
            mx: "auto",
          }}
        >
          <DrawerHeader>
            <Flex justify="space-between" align="center">
              <Text fontWeight="bold">Filter Tahun</Text>
              <DrawerCloseButton />
            </Flex>
          </DrawerHeader>
          <DrawerBody>
            <SimpleGrid columns={2} spacing={2}>
              {allYears.map((year) => (
                <Checkbox
                  key={year}
                  isChecked={selectedYears.includes(year)}
                  onChange={() => handleCheckboxChange(year)}
                >
                  {year}
                </Checkbox>
              ))}
            </SimpleGrid>
          </DrawerBody>
          <DrawerFooter>
            <Button
              bg="#1E5631"
              color="white"
              width="100%"
              _hover={{ bg: "#16432D" }}
              onClick={applyFilter}
            >
              Terapkan Filter
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default PerkembanganInovasiDesa;