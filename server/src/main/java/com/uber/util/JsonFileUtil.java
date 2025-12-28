package com.uber.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.util.Collections;
import java.util.List;

public class JsonFileUtil {
    private static final Logger logger = LoggerFactory.getLogger(JsonFileUtil.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final String DATA_DIR = "data";

    static {
        objectMapper.registerModule(new JavaTimeModule());
        File dir = new File(DATA_DIR);
        if (!dir.exists()) {
            dir.mkdirs();
        }
    }

    public static <T> void saveToFile(String filename, List<T> data) {
        try {
            File file = new File(DATA_DIR, filename);
            objectMapper.writeValue(file, data);
        } catch (IOException e) {
            logger.error("Failed to save data to file: {}", filename, e);
        }
    }

    public static <T> List<T> loadFromFile(String filename, TypeReference<List<T>> typeReference) {
        File file = new File(DATA_DIR, filename);
        if (!file.exists()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(file, typeReference);
        } catch (IOException e) {
            logger.error("Failed to load data from file: {}", filename, e);
            return Collections.emptyList();
        }
    }
}
